import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import Pagination from '@/components/pagination';
import NumberFormatter from '@/formatters/number-formatter';
import { createWMEnvironment } from '../helper';

const { router, store, localVue } = createWMEnvironment();
localVue.filter('number-formatter', NumberFormatter);

describe('pagination', () => {
  beforeEach(() => {
    router.push({}).catch(() => {});

    // Prime:
    store.dispatch('query/setView', 'statements');
  });

  it('pagination renders and update options', () => {
    const pagination = shallowMount(Pagination, {
      propsData: {
        total: 1000
      },
      store,
      localVue
    });

    const buttons = pagination.findAll('button');
    expect(buttons.length).to.equal(2);
    const query = store.getters['query/query'].statements;
    expect(query.from).to.equal(0);
  });

  it('pagination next/previous page', async () => {
    const pagination = shallowMount(Pagination, {
      propsData: {
        total: 200
      },
      store,
      localVue
    });

    let query = null;
    const buttons = pagination.findAll('button');
    await buttons.at(1).trigger('click');
    query = store.getters['query/query'].statements;
    expect(query.from).to.equal(50);

    await buttons.at(1).trigger('click');
    query = store.getters['query/query'].statements;
    expect(query.from).to.equal(100);

    await buttons.at(0).trigger('click');
    query = store.getters['query/query'].statements;
    expect(query.from).to.equal(50);
  });

  it('pagination total limit', async () => {
    const pagination = shallowMount(Pagination, {
      propsData: {
        total: 20
      },
      store,
      localVue
    });

    let query = null;
    const buttons = pagination.findAll('button');
    await buttons.at(1).trigger('click');
    query = store.getters['query/query'].statements;
    expect(query.from).to.equal(0);
  });
});


