import {
  test,
  expect,
  chromium,
  type BrowserContext,
  type Page,
} from '@playwright/test';

const BASE_URL =
  process.env.LOAD_TEST_BASE_URL ??
  'http://localhost:3000';

const USER_COUNT = Number(
  process.env.LOAD_TEST_USERS ?? 50
);

const USER_PREFIX =
  process.env.LOAD_TEST_USER_PREFIX ??
  'loadtest';

const PASSWORD =
  process.env.LOAD_TEST_PASSWORD ??
  'LoadTest1234';

const HOLD_TIME =
  Number(
    process.env.LOAD_TEST_HOLD_MS ??
      30000
  );

type UserResult = {
  user: string;
  success: boolean;

  loginMs: number;
  dashboardMs: number;
  missionStartMs: number;
  leaderboardMs: number;

  httpErrors: string[];
  consoleErrors: string[];

  message?: string;
};

function percentile(
  values: number[],
  p: number
) {
  if (!values.length) {
    return 0;
  }

  const sorted = [
    ...values,
  ].sort(
    (a, b) => a - b
  );

  const index = Math.ceil(
    (p / 100) *
      sorted.length
  ) - 1;

  return sorted[
    Math.max(
      0,
      Math.min(
        index,
        sorted.length - 1
      )
    )
  ];
}

async function runPlayer(
  browser: Awaited<
    ReturnType<
      typeof chromium.launch
    >
  >,
  userNumber: number
): Promise<UserResult> {
  const username =
    `${USER_PREFIX}${String(
      userNumber
    ).padStart(2, '0')}`;

  let context:
    | BrowserContext
    | null = null;

  let page:
    | Page
    | null = null;

  const httpErrors: string[] =
    [];

  const consoleErrors:
    string[] = [];

  let loginMs = 0;
  let dashboardMs = 0;
  let missionStartMs = 0;
  let leaderboardMs = 0;

  try {
    context =
      await browser.newContext();

    page =
      await context.newPage();

    // ---------------------------------------
    // COLLECT BROWSER ERRORS
    // ---------------------------------------

    page.on(
      'console',
      (message) => {
        if (
          message.type() ===
          'error'
        ) {
          consoleErrors.push(
            message.text()
          );
        }
      }
    );

    page.on(
      'pageerror',
      (error) => {
        consoleErrors.push(
          error.message
        );
      }
    );

    page.on(
      'requestfailed',
      (request) => {
        httpErrors.push(
          `FAILED ${request.method()} ${request.url()} - ${
            request.failure()
              ?.errorText ??
            'unknown error'
          }`
        );
      }
    );

    page.on(
      'response',
      (response) => {
        if (
          response.status() >=
          500
        ) {
          httpErrors.push(
            `${response.status()} ${response.request().method()} ${response.url()}`
          );
        }
      }
    );

    // ---------------------------------------
    // LOGIN PAGE
    // ---------------------------------------

    const loginPageStart =
      Date.now();

    await page.goto(
      `${BASE_URL}/login`,
      {
        waitUntil:
          'domcontentloaded',
        timeout: 30000,
      }
    );

    loginMs =
      Date.now() -
      loginPageStart;

    // ---------------------------------------
    // SIGN IN
    // ---------------------------------------

    await page
      .getByLabel(
        'Username'
      )
      .fill(username);

    await page
      .getByLabel(
        'Password'
      )
      .fill(PASSWORD);

    const dashboardStart =
      Date.now();

    await page
      .getByRole(
        'button',
        {
          name:
            /Enter Cyber Defence Unit/i,
        }
      )
      .click();

    await page.waitForURL(
      /\/(dashboard|onboarding|admin)/,
      {
        timeout: 30000,
      }
    );

    dashboardMs =
      Date.now() -
      dashboardStart;

    // ---------------------------------------
    // VERIFY PLAYER ACCOUNT
    // ---------------------------------------

    const url =
      page.url();

    if (
      url.includes(
        '/onboarding'
      )
    ) {
      throw new Error(
        `${username} has not completed onboarding.`
      );
    }

    if (
      url.includes('/admin')
    ) {
      throw new Error(
        `${username} is an admin account. Load-test accounts must be players.`
      );
    }

    await expect(
      page
    ).toHaveURL(
      /\/dashboard/
    );

    // ---------------------------------------
    // START / RESUME MISSION 01
    // ---------------------------------------

    const missionStart =
      Date.now();

    const missionResponse =
      await context.request.post(
        `${BASE_URL}/api/missions/1/start`,
        {
          headers: {
            Accept:
              'application/json',
          },
        }
      );

    missionStartMs =
      Date.now() -
      missionStart;

    if (
      !missionResponse.ok()
    ) {
      const body =
        await missionResponse
          .text()
          .catch(
            () => ''
          );

      throw new Error(
        `Mission start returned ${missionResponse.status()}: ${body.slice(
          0,
          250
        )}`
      );
    }

    // ---------------------------------------
    // OPEN LIVE LEADERBOARD
    // ---------------------------------------

    const leaderboardStart =
      Date.now();

    await page.goto(
      `${BASE_URL}/leaderboard`,
      {
        waitUntil:
          'domcontentloaded',
        timeout: 30000,
      }
    );

    leaderboardMs =
      Date.now() -
      leaderboardStart;

    await expect(
      page.getByText(
        'LIVE LEADERBOARD'
      )
    ).toBeVisible();

    // ---------------------------------------
    // KEEP SESSION ACTIVE
    //
    // This leaves all users connected at once,
    // including realtime subscriptions.
    // ---------------------------------------

    await page.waitForTimeout(
      HOLD_TIME
    );

    return {
      user: username,
      success: true,
      loginMs,
      dashboardMs,
      missionStartMs,
      leaderboardMs,
      httpErrors,
      consoleErrors,
    };
  } catch (error) {
    return {
      user: username,
      success: false,
      loginMs,
      dashboardMs,
      missionStartMs,
      leaderboardMs,
      httpErrors,
      consoleErrors,

      message:
        error instanceof Error
          ? error.message
          : String(error),
    };
  } finally {
    if (context) {
      await context.close();
    }
  }
}

test.describe(
  'Cyber Defence Unit load test',
  () => {
    test(
      '50 concurrent players',
      async () => {
        test.setTimeout(
          10 * 60 * 1000
        );

        console.log(
          '\n========================================'
        );

        console.log(
          'CYBER DEFENCE UNIT LOAD TEST'
        );

        console.log(
          '========================================'
        );

        console.log(
          `Target: ${BASE_URL}`
        );

        console.log(
          `Simulated players: ${USER_COUNT}`
        );

        console.log(
          `Concurrent hold: ${HOLD_TIME / 1000}s`
        );

        console.log(
          '========================================\n'
        );

        const browser =
          await chromium.launch({
            headless: true,
          });

        const start =
          Date.now();

        /*
         * Launch the players in small waves.
         *
         * This still results in all 50 being
         * online together but avoids the local
         * test computer itself freezing because
         * 50 Chromium contexts were created in
         * the exact same millisecond.
         */
        const results:
          UserResult[] = [];

        const WAVE_SIZE = 10;

        for (
          let startUser = 1;
          startUser <=
          USER_COUNT;
          startUser +=
            WAVE_SIZE
        ) {
          const endUser =
            Math.min(
              startUser +
                WAVE_SIZE -
                1,
              USER_COUNT
            );

          const wave =
            Array.from(
              {
                length:
                  endUser -
                  startUser +
                  1,
              },

              (_, index) =>
                runPlayer(
                  browser,
                  startUser +
                    index
                )
            );

          const waveResults =
            await Promise.all(
              wave
            );

          results.push(
            ...waveResults
          );

          console.log(
            `Started users ${startUser}-${endUser}`
          );

          // Small delay between waves
          if (
            endUser <
            USER_COUNT
          ) {
            await new Promise(
              (resolve) =>
                setTimeout(
                  resolve,
                  500
                )
            );
          }
        }

        await browser.close();

        const duration =
          Date.now() -
          start;

        // ---------------------------------------
        // RESULTS
        // ---------------------------------------

        const successful =
          results.filter(
            (result) =>
              result.success
          );

        const failed =
          results.filter(
            (result) =>
              !result.success
          );

        const allHttpErrors =
          results.flatMap(
            (result) =>
              result.httpErrors
          );

        const allConsoleErrors =
          results.flatMap(
            (result) =>
              result.consoleErrors
          );

        const dashboardTimes =
          successful.map(
            (result) =>
              result.dashboardMs
          );

        const missionTimes =
          successful.map(
            (result) =>
              result.missionStartMs
          );

        const leaderboardTimes =
          successful.map(
            (result) =>
              result.leaderboardMs
          );

        const failureRate =
          USER_COUNT === 0
            ? 0
            : failed.length /
              USER_COUNT;

        console.log(
          '\n========================================'
        );

        console.log(
          'LOAD TEST RESULTS'
        );

        console.log(
          '========================================'
        );

        console.log(
          `Total users: ${USER_COUNT}`
        );

        console.log(
          `Successful: ${successful.length}`
        );

        console.log(
          `Failed: ${failed.length}`
        );

        console.log(
          `Failure rate: ${(failureRate * 100).toFixed(
            2
          )}%`
        );

        console.log(
          `HTTP 5xx/request errors: ${allHttpErrors.length}`
        );

        console.log(
          `Browser console errors: ${allConsoleErrors.length}`
        );

        console.log(
          `Total test time: ${(duration / 1000).toFixed(
            1
          )} seconds`
        );

        console.log(
          '\n--- Dashboard ---'
        );

        console.log(
          `Median: ${percentile(
            dashboardTimes,
            50
          )} ms`
        );

        console.log(
          `P95: ${percentile(
            dashboardTimes,
            95
          )} ms`
        );

        console.log(
          `Max: ${Math.max(
            ...dashboardTimes,
            0
          )} ms`
        );

        console.log(
          '\n--- Mission Start API ---'
        );

        console.log(
          `Median: ${percentile(
            missionTimes,
            50
          )} ms`
        );

        console.log(
          `P95: ${percentile(
            missionTimes,
            95
          )} ms`
        );

        console.log(
          `Max: ${Math.max(
            ...missionTimes,
            0
          )} ms`
        );

        console.log(
          '\n--- Leaderboard ---'
        );

        console.log(
          `Median: ${percentile(
            leaderboardTimes,
            50
          )} ms`
        );

        console.log(
          `P95: ${percentile(
            leaderboardTimes,
            95
          )} ms`
        );

        console.log(
          `Max: ${Math.max(
            ...leaderboardTimes,
            0
          )} ms`
        );

        // ---------------------------------------
        // SHOW FAILED USERS
        // ---------------------------------------

        if (
          failed.length >
          0
        ) {
          console.log(
            '\n--- FAILED USERS ---'
          );

          for (
            const result of
            failed
          ) {
            console.log(
              `${result.user}: ${result.message}`
            );
          }
        }

        // ---------------------------------------
        // SHOW SERVER ERRORS
        // ---------------------------------------

        if (
          allHttpErrors.length >
          0
        ) {
          console.log(
            '\n--- HTTP ERRORS ---'
          );

          for (
            const error of
            allHttpErrors.slice(
              0,
              20
            )
          ) {
            console.log(
              error
            );
          }
        }

        // ---------------------------------------
        // PASS / FAIL CRITERIA
        // ---------------------------------------

        /*
         * These are our launch targets:
         *
         * Less than 2% failure
         * Dashboard P95 < 5 seconds
         * Mission API P95 < 2.5 seconds
         * Leaderboard P95 < 3 seconds
         * No HTTP 500 errors
         */

        const dashboardP95 =
          percentile(
            dashboardTimes,
            95
          );

        const missionP95 =
          percentile(
            missionTimes,
            95
          );

        const leaderboardP95 =
          percentile(
            leaderboardTimes,
            95
          );

        console.log(
          '\n========================================'
        );

        console.log(
          'LAUNCH ASSESSMENT'
        );

        console.log(
          '========================================'
        );

        const checks = {
          failureRate:
            failureRate <
            0.02,

          dashboard:
            dashboardP95 <
            5000,

          mission:
            missionP95 <
            2500,

          leaderboard:
            leaderboardP95 <
            3000,

          serverErrors:
            allHttpErrors.length ===
            0,
        };

        console.log(
          `Failure rate: ${
            checks.failureRate
              ? 'PASS'
              : 'FAIL'
          }`
        );

        console.log(
          `Dashboard P95: ${
            checks.dashboard
              ? 'PASS'
              : 'FAIL'
          }`
        );

        console.log(
          `Mission API P95: ${
            checks.mission
              ? 'PASS'
              : 'FAIL'
          }`
        );

        console.log(
          `Leaderboard P95: ${
            checks.leaderboard
              ? 'PASS'
              : 'FAIL'
          }`
        );

        console.log(
          `Server errors: ${
            checks.serverErrors
              ? 'PASS'
              : 'FAIL'
          }`
        );

        const overallPass =
          Object.values(
            checks
          ).every(Boolean);

        console.log(
          '\nOVERALL: ' +
            (
              overallPass
                ? '✅ READY FOR 50 USERS'
                : '❌ NEEDS ATTENTION'
            )
        );

        console.log(
          '========================================\n'
        );

        expect(
          failureRate,
          'Too many simulated users failed'
        ).toBeLessThan(
          0.02
        );

        expect(
          dashboardP95,
          'Dashboard P95 exceeded 5 seconds'
        ).toBeLessThan(
          5000
        );

        expect(
          missionP95,
          'Mission start P95 exceeded 2.5 seconds'
        ).toBeLessThan(
          2500
        );

        expect(
          leaderboardP95,
          'Leaderboard P95 exceeded 3 seconds'
        ).toBeLessThan(
          3000
        );

        expect(
          allHttpErrors,
          'HTTP/server errors occurred'
        ).toHaveLength(0);
      }
    );
  }
);