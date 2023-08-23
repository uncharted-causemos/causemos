import Poller from '@/api/poller';

describe('poller', () => {
  it('polling finishes', async () => {
    const promise = new Promise((resolve, reject) => {
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
        .success(resolve)
        .failure(reject)
        .start();
    });

    await expect(promise).resolves.toBe(2);
  });

  it('polling fails - exceeds threshold', async () => {
    const promise = new Promise((resolve, reject) => {
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
        .success(resolve)
        .failure(reject)
        .start();
    });
    await expect(promise).rejects.toThrowError('Exceed polling threshold 3');
  });

  it('polling fails - error thrown', async () => {
    const promise = new Promise((resolve, reject) => {
      new Poller(200, 10)
        .poll(async () => {
          return new Promise(() => {
            throw new Error('Dummy error');
          });
        })
        .success(resolve)
        .failure(reject)
        .start();
    });
    await expect(promise).rejects.toThrowError('Dummy error');
  });
});
