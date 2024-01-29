import chalk from 'chalk';

let currentSpinners = {};
let logs = [];

export const getSpinners = () => currentSpinners;
export const getLogs = () => logs;

export const useSpinners = (processName, color = chalk.white) => ({
  showSpinner: (name, message) => {
    const key = `${processName}-${name}`;
    currentSpinners[key] = message;
    return {
      update: (addition) => (currentSpinners[key] = `${message} (${addition})`),
      finish: (finalMessage = 'and removed') => (currentSpinners[key] = `Finished ${finalMessage}`),
      error: (info, addition = message) => {
        if (info instanceof Error) {
          logs.push(info);
          currentSpinners[key] = `Error ${message} (${info.message})`;
        } else {
          currentSpinners[key] = `Error ${message}`;
        }
      },
    };
  },
  log: (...args) => logs.push(args ? JSON.stringify(args) : 'undefined'),
});
