import { expect } from 'chai';
import Poller from '@/api/poller';

describe('poller', () => {
  it('polling finishes', (done) => {
    let c = 0;
    new Poller(200, 3)
      .poll(async () => {
        const r = await new Promise((resolve) => {
          setTimeout(() => resolve(++c), 100);
        });
        if (r === 2) {
          return [true, r];
        }
        return [false, r];
      })
      .success(r => {
        expect(r).to.equal(2);
        done();
      })
      .failure(() => {
        expect.fail();
        done();
      })
      .start();
  });

  it('polling fails - exceeds threshold', (done) => {
    const c = 0;
    new Poller(200, 3)
      .poll(async () => {
        const r = await new Promise((resolve) => {
          setTimeout(() => resolve(c), 100);
        });
        if (r === 2) {
          return [true, r];
        }
        return [false, r];
      })
      .success(() => {
        expect.fail();
        done();
      })
      .failure(() => {
        done();
      })
      .start();
  });

  it('polling fails - error thrown', (done) => {
    new Poller(200, 10)
      .poll(async () => {
        return new Promise(() => {
          throw new Error('Dummy error');
        });
      })
      .success(() => {
        expect.fail();
        done();
      })
      .failure((err) => {
        try {
          expect(err.message).to.equal('Dummy error');
          done();
        } catch (e) {
          done(e);
        }
      })
      .start();
  });
});
