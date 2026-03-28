const dbDriver = (process.env.DB_DRIVER || 'sqlite').trim().toLowerCase();
const isPostgres = dbDriver === 'postgres' || dbDriver === 'pg';

const dbBoolean = (value) => {
  const normalized = Boolean(value);
  return isPostgres ? normalized : normalized ? 1 : 0;
};

const activeCondition = (positive = true) => {
  if (isPostgres) return positive ? 'IS TRUE' : 'IS FALSE';
  return positive ? '= 1' : '= 0';
};

module.exports = { isPostgres, dbBoolean, activeCondition };