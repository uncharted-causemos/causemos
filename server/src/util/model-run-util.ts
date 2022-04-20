const respondUsingCode = async (res, serviceFcn, arguments) => {
  try {
    const serviceResult = await serviceFcn.apply(null, arguments);
    res.status(serviceResult.code).json(serviceResult.result);
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
};

module.exports = {
  respondUsingCode
};
