import type { Response } from 'express';

export const respondUsingCode = async (
  res: Response,
  serviceFcn: (...args: any[]) => Promise<{ code: number; result: any }>,
  args: any[]
): Promise<void> => {
  try {
    const serviceResult = await serviceFcn(...args);
    res.status(serviceResult.code).json(serviceResult.result);
  } catch (err: any) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
};
