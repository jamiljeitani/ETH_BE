const dayjs = require('dayjs');
function now() { return dayjs(); }
function isAtLeast24hLater(startISO) {
  const start = dayjs(startISO);
  return start.diff(dayjs(), 'hour') >= 24;
}
module.exports = { now, isAtLeast24hLater };
