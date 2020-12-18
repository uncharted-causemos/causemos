import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import NavBar from '@/components/nav-bar';
import { createWMEnvironment } from '../helper';

const { router, store, localVue } = createWMEnvironment();

describe('navbar', () => {
  it('navigation renders', () => {
    const navbar = shallowMount(NavBar, {
      router,
      store,
      localVue
    });
    const navItems = navbar.findAll('.navbar-header .nav .nav-item');
    expect(navItems.length).to.equal(1);
  });

  it('navigation changes', () => {
    const navbar = shallowMount(NavBar, {
      router,
      store,
      localVue
    });
    router.push({ name: 'kb', params: { project: 'xyz' } });
    const navItems = navbar.findAll('.navbar-header .nav .nav-item');
    // home, overview, data, kb, models
    expect(navItems.length).to.equal(5);
  });
});
