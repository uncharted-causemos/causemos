import * as $ from 'jquery';
import { createApp } from 'vue';

import ToggleButtonComponent from '@/components/widgets/toggle-button';

// Find the uncharted reader content element under $parent and create and inject reader switch button
// returns switch button object
export const createReaderSwitchButton = ({ parentElement, onClick = () => {}, description = 'Show PDF Document', isOn = true }) => {
  const propsData = { label: 'PDF Document', value: !isOn };
  const container = document.createElement('div');
  container.title = description;
  container.style.cssText = `
    font-size: 10px;
    padding: 5px;
  `;
  $(parentElement).find('.reader-content-header .close-button').before(container);

  const wrapper = document.createElement('div');
  const toggleButton = createApp(ToggleButtonComponent, propsData);
  toggleButton.mount(wrapper);

  // set switch to !isOn before mount and to isOn on next tick for animation
  // toggleButton.mount(container);
  // ToggleButton.$on('change', () => onClick());
  // setTimeout(() => (toggleButton.value = isOn), 0);

  container.appendChild(wrapper);

  return {
    element: container,
    onClick,
    destroy() {
      container.remove();
      // toggleButton.$destroy();
    }
  };
};
