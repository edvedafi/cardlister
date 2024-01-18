import Spinnies from 'spinnies';

let spinners;

const getSpinners = () => {
  if (!spinners) {
    spinners = new Spinnies();
  }
  return spinners;
};

let _paused = [];
let _pausedFinishes = [];
let _pausedErrors = [];
let isPaused = false;

export const showSpinner = (spinnerName, message) => {
  getSpinners().add(spinnerName, { text: message });
  if (isPaused) {
    _paused.push({ name: spinnerName, spinner: getSpinners().pick(spinnerName) });
    pauseSpinners();
  }
};

export const pauseSpinners = () => {
  const spinners = getSpinners();
  const paused = [];
  Object.keys(spinners.spinners).forEach((spinner) => {
    const s = spinners.pick(spinner);
    if (s.status !== 'fail' && s.status !== 'succeed') {
      _paused.push({ name: spinner, spinner: s });
      paused.push({ name: spinner, spinner: s });
      spinners.remove(spinner);
    }
  });

  spinners.stopAll();
  isPaused = true;
  return paused;
};

export const resumeSpinners = (pausedSpinners = _paused) => {
  pausedSpinners.forEach((spinner) => {
    getSpinners().remove(spinner.name);
    getSpinners().add(spinner.name, { ...spinner.spinner });
  });
  _paused = [];
  _pausedFinishes.forEach((finish) => finishSpinner(finish.name, finish.message));
  _pausedFinishes = [];
  _pausedErrors.forEach((error) => errorSpinner(error.name, error.message));
  _pausedErrors = [];
  isPaused = false;
};

export const finishSpinner = (spinnerName, message) => {
  const s = getSpinners().pick(spinnerName);
  if (isPaused) {
    _paused = _paused.filter((s) => s.name !== spinnerName);
    if (message) {
      _pausedFinishes.push({ name: spinnerName, message });
    }
  } else if (message) {
    if (!s) {
      getSpinners().add(spinnerName, { text: message });
    }
    getSpinners().succeed(spinnerName, { text: message });
  } else {
    if (s) {
      getSpinners().remove(spinnerName);
      return s?.text;
    }
  }
  return message;
};

export const errorSpinner = (spinnerName, message) => {
  if (isPaused) {
    _paused = _paused.filter((s) => s.name !== spinnerName);
    _pausedErrors.push({ name: spinnerName, message: message });
  } else {
    if (!getSpinners().pick(spinnerName)) {
      getSpinners().add(spinnerName, { text: message });
    }
    getSpinners().fail(spinnerName, { text: message });
  }
};

const log = (color, ...args) => {
  pauseSpinners();
  console.log(...args.map((arg) => (typeof arg === 'string' ? color(arg) : color(JSON.stringify(arg, null, 2)))));
  resumeSpinners();
};

export const useSpinners = (processName, color = chalk.white) => ({
  showSpinner: (name, message) => {
    showSpinner(`${processName}-${name}`, color.inverse(`${message}`));
    return {
      update: (addition) => showSpinner(`${processName}-${name}`, color.inverse(`${message} (${addition})`)),
      finish: (message) => finishSpinner(`${processName}-${name}`, message ? color(`${message}`) : null),
      error: (info, addition = message) => {
        if (info instanceof Error) {
          errorSpinner(`${processName}-${name}`, color(`${addition} (${info.message})`));
          log(color, info);
        } else {
          errorSpinner(`${processName}-${name}`, color(`${message}`));
        }
      },
    };
  },
  updateSpinner: (name, message) => {
    const spinnerName = `${processName}-${name}`;
    const spinner = getSpinners().pick(spinnerName);
    if (spinner) {
      if (isPaused) {
        const pausedSpinner = _paused.find((s) => s.name === spinnerName);
        if (pausedSpinner) {
          pausedSpinner.text = color.inverse(`${message}`);
        } else {
          showSpinner(spinnerName, color.inverse(`${message}`));
        }
      } else {
        getSpinners().update(spinnerName, { text: color.inverse(message) });
      }
    } else {
      showSpinner(spinnerName, color.inverse(`${message}`));
    }
  },
  finishSpinner: (name, message) => finishSpinner(`${processName}-${name}`, message ? color(`${message}`) : null),
  errorSpinner: (name, message) => errorSpinner(`${processName}-${name}`, color(`${message}`)),
  log: (...args) => log(color, ...args),
});
