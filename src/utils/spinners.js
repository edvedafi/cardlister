import Spinnies from 'spinnies';

let spinners;

const getSpinners = () => {
  if (!spinners) {
    spinners = new Spinnies();
  }
  return spinners;
};

export const useSpinners = (processName, color) => ({
  showSpinner: (name, message) =>
    getSpinners().add(`${processName}-${name}`, { text: color.inverse(`${name} - ${message}`) }),
  updateSpinner: (name, message) => {
    const spinnerName = `${processName}-${name}`;
    if (getSpinners().pick(spinnerName)) {
      getSpinners().update(spinnerName, { text: color.inverse(message) });
    } else {
      getSpinners().add(spinnerName, { text: color.inverse(message) });
    }
  },
  finishSpinner: (name, message) => {
    if (message) {
      getSpinners().succeed(`${processName}-${name}`, { text: color(`${name} - ${message}`) });
      return message;
    } else {
      const s = getSpinners().remove(`${processName}-${name}`);
      return s?.text;
    }
  },
  errorSpinner: (name, message) => getSpinners().fail(`${processName}-${name}`, { text: color(message) }),
  pauseSpinners: (spinnersToPause) => {
    const spinners = getSpinners();
    const paused = [];

    Object.keys(spinners.spinners).forEach((spinner) => {
      const s = spinners.pick(spinner);
      if (s.status !== 'fail' && s.status !== 'succeed') {
        paused.push({ name: spinner, spinner: s });
        spinners.remove(spinner);
      }
    });

    spinners.stopAll();
    return paused;
  },
  resumeSpinners: (pausedSpinners) =>
    pausedSpinners.forEach((spinner) => {
      getSpinners().remove(spinner.name);
      getSpinners().add(spinner.name, { ...spinner.spinner });
    }),
});
