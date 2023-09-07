const respondUsingCode = async (res, serviceFcn, args) => {
  try {
    const serviceResult = await serviceFcn.apply(null, args);
    res.status(serviceResult.code).json(serviceResult.result);
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
};

module.exports = {
  respondUsingCode,
};
