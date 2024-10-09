const axios = require('axios');
const ProductTransaction = require('../models/ProductTransaction');

// Initialize Database
exports.initializeDatabase = async (req, res) => {
  try {
    const { data } = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    await ProductTransaction.insertMany(data);
    res.status(200).json({ message: 'Database initialized successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize database' });
  }
};

// List Transactions with Pagination and Search
exports.listTransactions = async (req, res) => {
  const { month, search = '', page = 1, perPage = 10 } = req.query;
  const monthIndex = new Date(`${month} 01 2020`).getMonth();
  const skip = (page - 1) * perPage;
  const searchQuery = { $regex: search, $options: 'i' };

  const query = {
    $expr: { $eq: [{ $month: '$dateOfSale' }, monthIndex + 1] },
    $or: [
      { title: searchQuery },
      { description: searchQuery },
      { price: { $regex: search, $options: 'i' } }
    ]
  };

  try {
    const transactions = await ProductTransaction.find(query).skip(skip).limit(perPage);
    const total = await ProductTransaction.countDocuments(query);
    res.status(200).json({ transactions, total, page, perPage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// Statistics API
exports.getStatistics = async (req, res) => {
  const { month } = req.query;
  const monthIndex = new Date(`${month} 01 2020}`).getMonth();

  try {
    const transactions = await ProductTransaction.find({
      $expr: { $eq: [{ $month: '$dateOfSale' }, monthIndex + 1] }
    });

    const totalSaleAmount = transactions.reduce((acc, item) => acc + item.price, 0);
    const totalSoldItems = transactions.filter(item => item.sold).length;
    const totalUnsoldItems = transactions.filter(item => !item.sold).length;

    res.status(200).json({ totalSaleAmount, totalSoldItems, totalUnsoldItems });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Bar Chart API
exports.getBarChart = async (req, res) => {
  const { month } = req.query;
  const monthIndex = new Date(`${month} 01 2020}`).getMonth();

  try {
    const priceRanges = [
      { range: '0-100', min: 0, max: 100 },
      { range: '101-200', min: 101, max: 200 },
      { range: '201-300', min: 201, max: 300 },
      { range: '301-400', min: 301, max: 400 },
      { range: '401-500', min: 401, max: 500 },
      { range: '501-600', min: 501, max: 600 },
      { range: '601-700', min: 601, max: 700 },
      { range: '701-800', min: 701, max: 800 },
      { range: '801-900', min: 801, max: 900 },
      { range: '901-above', min: 901, max: Infinity }
    ];

    const transactions = await ProductTransaction.find({
      $expr: { $eq: [{ $month: '$dateOfSale' }, monthIndex + 1] }
    });

    const result = priceRanges.map(({ range, min, max }) => {
      const count = transactions.filter(item => item.price >= min && item.price <= max).length;
      return { range, count };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bar chart data' });
  }
};

// Pie Chart API
exports.getPieChart = async (req, res) => {
  const { month } = req.query;
  const monthIndex = new Date(`${month} 01 2020}`).getMonth();

  try {
    const categories = await ProductTransaction.aggregate([
      { $match: { $expr: { $eq: [{ $month: '$dateOfSale' }, monthIndex + 1] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pie chart data' });
  }
};

// Combined API
exports.getCombinedData = async (req, res) => {
  const { month } = req.query;
  try {
    const [statistics, barChart, pieChart] = await Promise.all([
      axios.get(`/api/statistics?month=${month}`),
      axios.get(`/api/bar-chart?month=${month}`),
      axios.get(`/api/pie-chart?month=${month}`)
    ]);

    res.status(200).json({
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch combined data' });
  }
};
