const respondUsingCode = async (req, res, serviceFcn) => {
  const metadata = req.body;
  try {
    await serviceFcn(metadata);
    res.status(200).json({});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
};

module.exports = {
  respondUsingCode
};
