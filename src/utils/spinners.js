import Spinnies from 'spinnies';

let spinners;

const getSpinners = () => {
  if (!spinners) {
    spinners = new Spinnies();
  }
  return spinners;
};

export const useSpinners = (processName, color) => ({
  showSpinner: (name, message) => getSpinners().add(`${processName}-${name}`, { text: color.inverse(message) }),
  updateSpinner: (name, message) => getSpinners().update(`${processName}-${name}`, { text: color.inverse(message) }),
  finishSpinner: (name, message) =>
    message
      ? getSpinners().succeed(`${processName}-${name}`, { text: color(message) })
      : getSpinners().remove(`${processName}-${name}`),
  errorSpinner: (name, message) => getSpinners().fail(`${processName}-${name}`, { text: color(message) }),
});
