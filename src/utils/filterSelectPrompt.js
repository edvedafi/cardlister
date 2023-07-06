import {
  createPrompt,
  useState,
  useKeypress,
  useRef,
  usePrefix,
  isEnterKey,
  isUpKey,
  isDownKey,
  isNumberKey,
  isBackspaceKey,
  Paginator
} from '@inquirer/core';
import chalk from 'chalk';
import figures from 'figures';
import ansiEscapes from 'ansi-escapes';
import Fuse from 'fuse.js'

function isSelectableChoice(
  choice
){
  return choice != null && !choice.disabled;
}

function isEsacpeKey(key) {
  return key.name === 'escape';
}

export default createPrompt(
  (
    config,
    done
  ) => {

    const paginator = useRef(new Paginator()).current;
    const firstRender = useRef(true);

    const prefix = usePrefix();
    const [status, setStatus] = useState('pending');
    const [searchTerm, setSearchTerm] = useState(config.default || '');

    const keys = config.choices[0].name && config.choices[0].description ? ["name", "description"] : ["value"];

    const defaultFuse = useRef(new Fuse(config.choices, { keys })).current;
    const [choices, setChoices] = useState(config.default ? defaultFuse.search(config?.default?.display || config.default).map((result) => result.item): config.choices);
    
    const [cursorPosition, setCursorPos] = useState(0);

    // Safe to assume the cursor position always point to a Choice.
    const choice = choices[cursorPosition];

    useKeypress((key) => {
      // console.log(key);
      if (isEnterKey(key)) {
        setSearchTerm('');
        setStatus('done');
        done(choice.value);
      } else if (isEsacpeKey(key)) {
        if (config.cancelable && searchTerm === '') {
          setChoices([]);
          setStatus('aborted');
          done(undefined);
        } else {
          setSearchTerm('');
          setChoices(config.choices);
          setCursorPos(0);
        }
      } else if (isUpKey(key) || isDownKey(key)) {
        let newCursorPosition = cursorPosition;
        const offset = isUpKey(key) ? -1 : 1;
        let selectedOption;

        while (!isSelectableChoice(selectedOption)) {
          newCursorPosition =
            (newCursorPosition + offset + choices.length) % choices.length;
          selectedOption = choices[newCursorPosition];
        }

        setCursorPos(newCursorPosition);
        setSearchTerm('');
      } else if (isNumberKey(key)) {
        // Adjust index to start at 1
        const newCursorPosition = Number(key.name) - 1;

        // Abort if the choice doesn't exists or if disabled
        if (!isSelectableChoice(choices[newCursorPosition])) {
          return;
        }

        setCursorPos(newCursorPosition);
      } else {
        //search choices for the closest matches

        // Change the pattern
        const pattern = isBackspaceKey(key) ? searchTerm.slice(0, -1) : searchTerm + key.sequence;
        if (pattern === '') {
          setChoices(config.choices);
          setCursorPos(0);
        } else {
          setChoices(defaultFuse.search(pattern).map((result) => result.item));
          setCursorPos(0);
        }
        setSearchTerm(pattern);
      }
    });

    let message = chalk.bold(config.message);
    if (searchTerm) {      
      message += chalk.dim(' ' + searchTerm);
    }
    if (firstRender.current) {
      message += chalk.dim(' (Use arrow keys or type to search)');
      firstRender.current = false;
    }

    if (status === 'done') {
      return `${prefix} ${message} ${chalk.cyan(choice.name || choice.value)}`;
    }

    const allChoices = choices
      .map((choice, index) => {

        const line = choice.name || choice.value;
        if (choice.disabled) {
          const disabledLabel =
            typeof choice.disabled === 'string' ? choice.disabled : '(disabled)';
          return chalk.dim(`- ${line} ${disabledLabel}`);
        }

        if (index === cursorPosition) {
          return chalk.cyan(`${figures.pointer} ${line}`);
        }

        return `  ${line}`;
      })
      .join('\n');

    const windowedChoices = paginator.paginate(
      allChoices,
      cursorPosition,
      config.pageSize
    );
    // console.log(allChoices);
    const choiceDescription = choice ? choice.description ? `\n${choice.description}` : `` : 'No Matches';

    return status === 'aborted' ? `${prefix} ${message}` : `${prefix} ${message}\n${windowedChoices}${choiceDescription}${ansiEscapes.cursorHide}`;
  }
);