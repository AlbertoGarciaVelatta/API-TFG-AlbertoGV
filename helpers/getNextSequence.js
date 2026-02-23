const Counter = require("../models/counter");

async function getNextSequence(name) {
  const result = await Counter.findByIdAndUpdate(
    name,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return result.sequence_value;
}

module.exports = getNextSequence;