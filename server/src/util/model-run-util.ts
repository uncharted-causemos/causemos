const respondUsingCode = async (req, res, serviceFcn) => {
  const metadata = req.body;
  try {
    const serviceResult = await serviceFcn(metadata);
    res.status(serviceResult.code).json(serviceResult.result);
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
};

module.exports = {
  respondUsingCode
};
