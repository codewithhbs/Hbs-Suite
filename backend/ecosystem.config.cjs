/**
 * PM2 - HBS Suite backend
 *
 *   pm2 start ecosystem.config.cjs        first start
 *   pm2 reload ecosystem.config.cjs       zero-downtime redeploy
 *
 * hbs-suite         stateless HTTP API, cluster mode (sessions are signed cookies,
 *                   rate limits + cache live in Redis) - scale with API_INSTANCES
 * hbs-suite-worker  BullMQ consumers + repeatable job scheduler. Safe to run more
 *                   than one: schedules are upserted by id, each job runs once.
 */
const path = require("node:path");
const cwd = __dirname;

module.exports = {
  apps: [
    {
      name: "hbs-suite",
      cwd,
      script: path.join(cwd, "src/server.js"),
      exec_mode: "cluster",
      instances: Number(process.env.API_INSTANCES || 2),
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        TZ: "Asia/Kolkata",
        PORT: 4000,
        HOST: "127.0.0.1",
      },
      out_file: "/var/log/hbs-suite/hbs-suite.out.log",
      error_file: "/var/log/hbs-suite/hbs-suite.err.log",
      time: true,
    },
    {
      name: "hbs-suite-worker",
      cwd,
      script: path.join(cwd, "src/workers/index.js"),
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "1500M",
      restart_delay: 5000,
      kill_timeout: 30000,
      env: { NODE_ENV: "production", TZ: "Asia/Kolkata" },
      out_file: "/var/log/hbs-suite/hbs-suite-worker.out.log",
      error_file: "/var/log/hbs-suite/hbs-suite-worker.err.log",
      time: true,
    },
  ],
};
