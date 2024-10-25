const bcrypt = require('bcrypt')
const JWT = require('jsonwebtoken')

const passwordToHash = async (password) => {
    return await bcrypt.hash(password, 10)
}

const passwordHashCompare = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword)
}

const generateAccessToken = (user) => {
    return JWT.sign({ name: user.userid, ...user }, process.env.ACCESS_TOKEN_SECRET_KEY, { expiresIn: '1w' })
}

const generateRefreshToken = (user) => {
    return JWT.sign({ name: user.userid, ...user }, process.env.REFRESH_TOKEN_SECRET_KEY)
}

const dateToIsoFormatWithTimezoneOffset = (date) => {
    date.setTime(date.getTime() - date.getTimezoneOffset() * 60000)
    return date.toISOString().split('T')[0]
}

const delInArray = (arr, item) => {
    const index = arr.indexOf(item)
    if (index !== -1) {
        arr.splice(index, 1)
    }

    return arr
}

const missingNumber = (arr) => {
    let _missingNumber = null
    for (let i = 10; i <= arr[arr.length - 1]; i++) {
        if (!arr.includes(i)) {
            _missingNumber = i
            break
        }
    }
    return _missingNumber
}



 const getInterest = (maturity_date, interest_rate, price) => {

    if(!maturity_date){
      maturity_date= new Date();
    }
    const maturityDays = new Date(maturity_date ?? "") - new Date();
    const maturity = Math.ceil(maturityDays / (1000 * 60 * 60 * 24));
    const interest_cost = price * (((interest_rate / 100) * maturity) / 365);
    const total_with_interest = price - interest_cost;
  
    return total_with_interest;
  };

const OrderStatus= ['Alındı',  "Üretiliyor", "Üretildi", "Sevk Bekliyor", 'Sevk Edildi']

// Bu fonksiyon, bir siparişin ortalama tipini hesaplar.
 const calculateAverageType = (order) => {
  // Bu yardımcı fonksiyon, bir ürünün ortalama tipini hesaplar.
  const _calculateAverageType = (product) => {
    // Toplam sipariş durumu sayısını alır.
    const totalTypeCount = product.orderStatus.length;
    // Her sipariş durumunun tipinin indeksini toplar.
    const totalTypeIndex = product.orderStatus.reduce(
      (total, status) => total + OrderStatus.indexOf(status.statustype),
      0
    );

    // Toplam indeks sayısını toplam durum sayısına böler ve ortalama tipi döndürür.
    return totalTypeIndex / totalTypeCount;
  };

  // Siparişin tüm ürünlerinin ve setlerinin ortalama tiplerini toplar ve bunları toplam ürün ve set sayısına böler.
  // Bu, siparişin ortalama tipini verir.
  return (
    (order.products.reduce(
      (total, product) => total + _calculateAverageType(product),
      0
    )) /
    (order.products.length)
  );
};
module.exports = {
    passwordToHash,
    passwordHashCompare,
    generateAccessToken,
    generateRefreshToken,
    dateToIsoFormatWithTimezoneOffset,
    delInArray,
    missingNumber,
    getInterest,
    calculateAverageType
}
