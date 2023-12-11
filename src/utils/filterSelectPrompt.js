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
  Separator,
} from '@inquirer/core';
import chalk from 'chalk';
import figures from 'figures';
import ansiEscapes from 'ansi-escapes';
import Fuse from 'fuse.js';
import { useMemo, usePagination } from '@inquirer/prompts';

function isSelectable(item) {
  return !Separator.isSeparator(item) && !item.disabled;
}

function isEscapeKey(key) {
  return key.name === 'escape';
}

function renderItem({ item, isActive }) {
  if (item) {
    if (Separator.isSeparator(item)) {
      return ` ${item.separator}`;
    }

    const line = item.name || item.value;
    if (item.disabled) {
      const disabledLabel = typeof item.disabled === 'string' ? item.disabled : '(disabled)';
      return chalk.dim(`- ${line} ${disabledLabel}`);
    }

    const color = isActive ? chalk.cyan : (x) => x;
    const prefix = isActive ? figures.pointer : ` `;
    return color(`${prefix} ${line}`);
  } else {
    return '';
  }
}

export default createPrompt((config, done) => {
  const { loop = true, pageSize } = config;
  const firstRender = useRef(true);
  const prefix = usePrefix();
  const [status, setStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState(config.default?.name || config.default || '');

  const defaultFuse = useRef(new Fuse(config.choices, { keys: ['name', 'value', 'description'] })).current;
  const [items, setItems] = useState(
    config.default
      ? defaultFuse.search(config?.default?.name || config.default).map((result) => result.item)
      : config.choices,
  );

  const bounds = useMemo(() => {
    let first = items.findIndex(isSelectable);
    // TODO: Replace with `findLastIndex` when it's available.
    const last = items.length - 1 - [...items].reverse().findIndex(isSelectable);
    return { first, last };
  }, [items]);

  const defaultItemIndex = useMemo(() => {
    if (!('default' in config)) return -1;
    return items.findIndex((item) => isSelectable(item) && item.value === config.default);
  }, [config.default, items]);

  const [active, setActive] = useState(defaultItemIndex === -1 ? bounds.first : defaultItemIndex);

  // Safe to assume the cursor position always point to a Choice.
  const selectedChoice = items[active] || { description: 'No values match filter. Press escape to clear filter.' };

  useKeypress((key) => {
    if (isEscapeKey(key)) {
      if (searchTerm === '') {
        setStatus('done');
        done();
      } else {
        setSearchTerm('');
        setItems(config.choices);
        setActive(0);
      }
    } else if (isEnterKey(key)) {
      setStatus('done');
      if (selectedChoice) {
        done(selectedChoice.value);
      } else {
        done();
      }
    } else if (isUpKey(key) || isDownKey(key)) {
      if (loop || (isUpKey(key) && active !== bounds.first) || (isDownKey(key) && active !== bounds.last)) {
        const offset = isUpKey(key) ? -1 : 1;
        let next = active;
        do {
          next = (next + offset + items.length) % items.length;
        } while (items[next] ? !isSelectable(items[next]) : false);
        setActive(next);
      }
    } else if (isNumberKey(key)) {
      const position = Number(key.name) - 1;
      const item = items[position];
      if (item != null && isSelectable(item)) {
        setActive(position);
      }
    } else {
      //search choices for the closest matches

      // Change the pattern
      const pattern = isBackspaceKey(key) ? searchTerm.slice(0, -1) : searchTerm + key.name;
      if (pattern === '') {
        setItems(config.choices);
      } else {
        setItems(defaultFuse.search(pattern).map((result) => result.item));
      }
      setSearchTerm(pattern);
      setActive(0);
    }
  });

  let message = chalk.bold(config.message);
  if (firstRender.current) {
    firstRender.current = false;
    message += chalk.dim(' (Use arrow keys)');
  }

  let page = '';
  if (items.length > 0) {
    page = usePagination({
      items,
      active,
      renderItem,
      pageSize,
      loop,
    });
  }

  if (status === 'done') {
    return `${prefix} ${message} ${chalk.cyan(selectedChoice.name || selectedChoice.value)}`;
  }

  const choiceDescription = selectedChoice.description ? `\n${selectedChoice.description}` : ``;

  return `${prefix} ${message}: ${searchTerm}\n${page}${choiceDescription}${ansiEscapes.cursorHide}`;
});
