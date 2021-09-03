const respondUsingCode = async (req: { body: any; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: {}): void; new(): any; }; send: { (arg0: string): void; new(): any; }; }; }, serviceFcn: any) => {
  const metadata = req.body;
  try {
    await serviceFcn(metadata);
    res.status(200).json({});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
};

export default {
  respondUsingCode
};
