import Spinnies from 'spinnies';

let spinners;

const getSpinners = () => {
  if (!spinners) {
    spinners = new Spinnies();
  }
  return spinners;
};

let _paused = [];

export const pauseSpinners = () => {
  const spinners = getSpinners();

  Object.keys(spinners.spinners).forEach((spinner) => {
    const s = spinners.pick(spinner);
    if (s.status !== 'fail' && s.status !== 'succeed') {
      _paused.push({ name: spinner, spinner: s });
      spinners.remove(spinner);
    }
  });

  spinners.stopAll();
  return _paused;
};

export const resumeSpinners = (pausedSpinners = _paused) => {
  console.log('RESUME SPINNERS');
  pausedSpinners.forEach((spinner) => {
    getSpinners().remove(spinner.name);
    getSpinners().add(spinner.name, { ...spinner.spinner });
  });
  _paused = [];
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
    const s = getSpinners().pick(`${processName}-${name}`);
    if (message) {
      if (!s) {
        getSpinners().add(`${processName}-${name}`, { text: color(`${message}`) });
      }
      getSpinners().succeed(`${processName}-${name}`, { text: color(`${message}`) });
      return message;
    } else {
      if (s) {
        getSpinners().remove(`${processName}-${name}`);
        return s?.text;
      }
      return message;
    }
  },
  errorSpinner: (name, message) => getSpinners().fail(`${processName}-${name}`, { text: color(message) }),
  pauseSpinners: pauseSpinners,
  resumeSpinners: resumeSpinners,
});
