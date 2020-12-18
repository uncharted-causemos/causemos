
import * as $ from 'jquery';
import Vue from 'vue';
import ToggleButtonComponent from '@/components/widgets/toggle-button';

const ToggleButton = Vue.extend(ToggleButtonComponent);
// Find the uncharted reader content element under $parent and create and inject reader switch button
// returns switch button object
export const createReaderSwitchButton = ({ parentElement, onClick = () => {}, description = 'Show PDF Document', isOn = true }) => {
  const container = document.createElement('div');
  container.title = description;
  container.style.cssText = `
    font-size: 10px;
    padding: 5px;
  `;
  $(parentElement).find('.reader-content-header .close-button').before(container);

  const toggleButton = new ToggleButton({
    propsData: {
      label: 'PDF Document',
      value: !isOn
    }
  });
  // set switch to !isOn before mount and to isOn on next tick for animation
  toggleButton.$mount();
  toggleButton.$on('change', () => onClick());
  setTimeout(() => (toggleButton.value = isOn), 0);

  container.appendChild(toggleButton.$el);

  return {
    element: container,
    onClick,
    destroy() {
      container.remove();
      toggleButton.$destroy();
    }
  };
};
