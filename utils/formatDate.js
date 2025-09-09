const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  } catch (error) {
    console.error('formatDate error:', error.message);
    throw error;
  }
};

module.exports = formatDate;
