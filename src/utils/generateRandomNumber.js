module.exports = function () {
  // Genera un número aleatorio entre 0 y 99999999
  let randomNumber = Math.floor(Math.random() * 100000000)

  // Asegura que el número tenga exactamente 8 dígitos
  return String(randomNumber).padStart(8, '0')
}
