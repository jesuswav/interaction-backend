const { Builder, By, until } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')

const options = new chrome.Options()
// options.addArguments('headless')
// options.addArguments('disable-gpu')
options.addArguments('--disable-notifications')

const dotenv = require('dotenv')

dotenv.config()

// Esperar a que la pagina termine de cargar para garantizar que exista la clase
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function scrape(url) {
  // Inicializar el navegador Selenium (asegúrate de tener el WebDriver correspondiente)
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build()

  let post = {
    post_id: '',
    description: '',
    post_url: '',
    likes: '',
    shared: '',
    images: [],
    likesList: [],
  }

  const url1 = 'https://www.facebook.com/share/p/denWZ7obUeX4Kwzu/'
  const url2 =
    'https://www.facebook.com/linda.ruiz.54738/posts/pfbid02S3NGmbQn23WF4J6gaYq6sxREDnsiCjbkAWPaiuzw5kiyDcBXCQ9z88oN7XmtGvPl'
  const url3 = 'https://www.facebook.com/share/p/E7ek6b1qzTR9racG/'

  try {
    // Abre una página web
    await driver.get(url)

    await sleep(3000)

    post.post_url = url

    const logged = await login(driver)

    if (logged) {
      // Obtener id y asignarlo al arreglo
      try {
        const id = await getPostId(url)
        post.post_id = id[0]
      } catch {
        console.log('Error al obtener el id del post.')
      }

      try {
        const description = await getDescription(
          driver,
          'span.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.xudqn12.x3x7a5m.x6prxxf.xvq8zen.xo1l8bm.xzsf02u.x1yc453h'
        )
        post.description = description
      } catch (e) {
        console.log(e)
        console.log('Error al obtener la descripción')
        post.description = 'Sin descripción'
      }

      try {
        const images = await getImages(
          driver,
          'img.xz74otr.x1ey2m1c.xds687c.x5yr21d.x10l6tqk.x17qophe.x13vifvy.xh8yej3'
        )
        post.images = images
      } catch (e) {
        console.log(e)
        console.log('Error al obtener las imagenes de la publicación')
        post.images = []
      }

      // Obtener los likes de la publicación
      try {
        // En caso de no tener ningún like el objeto que buscamos no existe
        post.likes = await getLikes(
          driver,
          'span.xrbpyxo.x6ikm8r.x10wlt62.xlyipyv.x1exxlbk'
        )
      } catch {
        console.log('Este post no ha sido compartido')
        // como no existe le damos el valor de 0
        post.likes = 0
      }

      // Saber cuantas veces se ha compartido esa publicación
      try {
        post.shared = await getShared(
          driver,
          'span.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.xudqn12.x3x7a5m.x6prxxf.xvq8zen.xo1l8bm.xi81zsa'
        )
      } catch {
        console.log('Este post no ha sido compartido')
        post.shared = 0
      }

      // x1lq5wgf xgqcy7u x30kzoy x9jhf4c x1lliihq

      try {
        post.likesList = await getLikesList(driver)
      } catch {
        console.log('Error al obtener la lista de los likes')
      }

      return post
    } else {
      console.log('Sesion no iniciada')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    // Cierra el navegador
    // await driver.quit()
  }
}

// Make login
const login = async (driver) => {
  try {
    let session = false

    await driver.manage().window().maximize()

    // Localizar el campo de correo electrónico por su atributo name
    let usernameField = await driver.findElement(By.css('input[name="email"]'))

    // Localizar el campo de contraseña por su atributo type y name
    let passwordField = await driver.findElement(By.css('input[name="pass"]'))

    await sleep(2000)

    await usernameField.clear()
    await passwordField.clear()

    await usernameField.sendKeys(process.env.FB_USERNAME)
    await passwordField.sendKeys(process.env.FB_PASSWORD)

    // Cerrar ventana
    const close = await driver.findElement(
      By.css(
        '.x1i10hfl.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz.x6s0dn4.xzolkzo.x12go9s9.x1rnf11y.xprq8jg.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x78zum5.xl56j7k.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.xc9qbxq.x14qfxbe.x1qhmfi1'
      )
    )

    await close.click()

    // Localizar el botón de inicio de sesión
    let loginButton = await driver.findElement(
      By.css(
        'div.x1i10hfl.x1qjc9v5.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x3nfvp2.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz.xtvsq51.xhk9q7s.x1otrzb0.x1i1ezom.x1o6z2jb.x1vqgdyp.x6ikm8r.x10wlt62.xexx8yu.xn6708d.x1120s5i.x1ye3gou'
      )
    )

    console.log('Dando click al boton')
    await loginButton.click()

    console.log('Sesion iniciada correctamente')

    session = true
    return session
  } catch (e) {
    console.log('Error in login.', e)
    await driver.quit()
  }
}

// Get list of likes
const getLikesList = async (driver) => {
  try {
    // Esperar a que el elemento esté presente y visible
    let element = await driver.findElement(
      By.css(
        // 'div.x6s0dn4.xi81zsa.x78zum5.x6prxxf.x13a6bvl.xvq8zen.xdj266r.xat24cr.x1d52u69.xktsk01.x889kno.x1a8lsjc.xkhd6sd.x4uap5.xdppsyt'
        // 'div.x6s0dn4.x78zum5.x1iyjqo2.x6ikm8r.x10wlt62'
        // 'span.x4k7w5x.x1h91t0o.x1h9r5lt.x1jfb8zj.xv2umb2.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1qrby5j'
        'div.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x1n2onr6.x87ps6o.x1lku1pv.x1a2a7pz.x1heor9g.xnl1qt8.x6ikm8r.x10wlt62.x1vjfegm.x1lliihq'
        // 'span.xrbpyxo.x6ikm8r.x10wlt62.xlyipyv.x1exxlbk'
        // 'span.xt0b8zv.x2bj2ny.xrbpyxo.xl423tq'
        // 'div[role="button"]'
      )
    )

    // let element = await driver.findElement(
    //   By.xpath("//div[contains(@class, 'x1ja2u2z') and @role='button']")
    // )

    // await driver.executeScript('arguments[0].scrollIntoView(true);', element)

    // Espera hasta que el elemento sea clickeable
    await driver.wait(until.elementIsVisible(element), 10000)
    await driver.wait(until.elementIsEnabled(element), 10000)

    sleep(6000)

    await element.click()
    console.log('Elemento clicado exitosamente 2.')

    sleep(6000)

    let container = await driver.findElements(
      By.css(
        // '.__fb-light-mode.x1bhdrnm.xf2yzuf.xfvmy8p.x583dml.x1n2onr6.xzkaem6'
        // '.__fb-light-mode.x18whdkh.x1p4z1cd.xfvmy8p.xahrfoy.x1n2onr6.xzkaem6'
        // '.__fb-light-mode.x18whdkh.xa7am5w.xfvmy8p.xahrfoy.x1n2onr6.xzkaem6'
        '.__fb-light-mode.x1owg0sl.xa7am5w.xfvmy8p.xahrfoy.x1n2onr6.xzkaem6'
      )
    )

    await sleep(4000)

    // Comprobar si existe al menos un elemento con la clase especificada
    if (container.length > 0) {
      // // Definir el selector del elemento
      // let selector = By.css(
      //   '.xb57i2i.x1q594ok.x5lxg6s.x78zum5.xdt5ytf.x6ikm8r.x1ja2u2z.x1pq812k.x1rohswg.xfk6m8.x1yqm8si.xjx87ck.xx8ngbg.xwo3gff.x1n2onr6.x1oyok0e.x1odjw0f.x1iyjqo2.xy5w88m'
      // )

      // // Esperar hasta que el elemento sea visible
      // await driver.wait(
      //   until.elementIsVisible(driver.findElement(selector)),
      //   10000
      // )

      // // Encontrar el elemento
      // let scrollElement = await driver.findElement(selector)

      // // Hacer scroll hasta el final del elemento
      // await driver.executeScript(
      //   'arguments[0].scrollTop = arguments[0].scrollHeight;',
      //   scrollElement
      // )

      await sleep(5000)

      await driver.wait(
        until.elementLocated(
          By.css(
            '.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.xudqn12.x3x7a5m.x6prxxf.xvq8zen.xk50ysn.xzsf02u.x1yc453h'
            // '.x1qjc9v5.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1r8uery.xdt5ytf.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.x2lwn1j.xeuugli.x4uap5.xkhd6sd.xz9dl7a.xsag5q8.x1n2onr6.x1ja2u2z'
            // '.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1sur9pj.xkrqix3.xzsf02u.x1s688f'
          )
        ),
        2000
      )

      sleep(10000)

      let elementos = await driver.findElements(
        By.css(
          // '.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6'
          // '.x78zum5.xdt5ytf.xz62fqu.x16ldp7u'
          // '.x6s0dn4.xkh2ocl.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1q0g3np.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.x2lwn1j.xeuugli.x18d9i69.x4uap5.xkhd6sd.xexx8yu.x1n2onr6.x1ja2u2z'
          // ':r1o:'
          '.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.xudqn12.x3x7a5m.x6prxxf.xvq8zen.xk50ysn.xzsf02u.x1yc453h'
          // 2 - '.x1qjc9v5.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1r8uery.xdt5ytf.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.x2lwn1j.xeuugli.x4uap5.xkhd6sd.xz9dl7a.xsag5q8.x1n2onr6.x1ja2u2z'
          // '.x1qjc9v5.x78zum5.xdt5ytf.x1n2onr6.x1al4vs7.x1jx94hy.xrjkcco.x58fqnu.x1mh14rs.xfkwgsy.x104qc98.x1gj8qfm.x1iyjqo2.x6ikm8r.x10wlt62.x1likypf.xzit4ce.x1e9k66k.x12l8kdc'
          // '.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1sur9pj.xkrqix3.xzsf02u.x1s688f'
          // '.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1sur9pj.xkrqix3.xzsf02u.x1s688f'
          // '.x6s0dn4.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1q0g3np.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.xeuugli.x18d9i69.x1sxyh0.xurb0ha.xexx8yu.x1n2onr6.x1ja2u2z.x1gg8mnh'
          // '.x1qjc9v5.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1r8uery.xdt5ytf.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.x2lwn1j.xeuugli.x4uap5.xkhd6sd.xz9dl7a.xsag5q8.x1n2onr6.x1ja2u2z'
          // 'span[id=":r3q:"]'
          // '.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1sur9pj.xkrqix3.xzsf02u.x1s688f'
        )
      )

      sleep(3000)

      // Crear un array para almacenar los textos
      let textos = []

      // Iterar sobre los elementos y obtener el texto de cada uno
      for (let elemento of elementos) {
        let texto = await elemento.getText()
        textos.push(texto)
      }

      // Mostrar el array de textos en la consola
      console.log(textos)
      return textos
    } else {
      console.log('El elemento no existe en la página.')
    }
  } catch (error) {
    console.error('Error al interactuar con el elemento:', error)
  } finally {
    // Cerrar el navegador
    await driver.quit()
  }
}

// Obtener el id del post
const getPostId = async (url) => {
  const result = url.match(/[^/]+$/)

  return result
}

// Obtener la descripción del posts
const getDescription = async (driver, element) => {
  // Elemento que contiene la descripción
  let description = await driver.findElement(By.css(element)).getText()

  const textDescription = description.replace(/\n/g, ' ')

  const standarDescription = textDescription.substring(0, 255)

  return standarDescription
}

// Función para saber cuantos likes tiene una publicación
const getLikes = async (driver, element) => {
  // Obtener los likes de la publicación
  let likes = await driver.findElement(By.css(element)).getText()

  // Obtenemos solo el número de likes, evitanto la nomenclatura
  let likesNumber = convertNumber(likes)

  return likesNumber
}

function convertNumber(cadena) {
  // Eliminar espacios en blanco al inicio y final de la cadena
  cadena = cadena.trim()

  // Remplazar coma por punto para manejar decimales
  cadena = cadena.replace(',', '.')

  // Expresiones regulares para diferentes casos
  const regexMil = /^([\d.]+)\s*mil$/i
  const regexMill = /^([\d.]+)\s*mill$/i
  const regexSoloNumero = /^[\d.]+$/

  if (regexMil.test(cadena)) {
    // Si la cadena contiene "mil"
    const match = cadena.match(regexMil)
    const numero = parseFloat(match[1])
    return Math.round(numero * 1000)
  } else if (regexMill.test(cadena)) {
    // Si la cadena contiene "mill" (millones)
    const match = cadena.match(regexMill)
    const numero = parseFloat(match[1])
    return Math.round(numero * 1000000)
  } else if (regexSoloNumero.test(cadena)) {
    // Si la cadena es solo un número
    const numero = parseFloat(cadena)
    return Math.round(numero)
  } else {
    // Si la cadena no coincide con ningún formato esperado, retornar null o lanzar un error
    return null
  }
}

// Función para obtener las veces que ha sido compartida una publicación
const getShared = async (driver, element) => {
  let sharedElements = await driver.findElements(By.css(element))

  const shared = await sharedElements[2].getText()

  const sharedNumber = shared.match(/\d+/g)

  let finalShared = parseInt(sharedNumber.join(''))

  return finalShared
}

// Función para obtener las imagenes de una publicación
const getImages = async (driver, element) => {
  // Obtener las imagenes que contenga la publicación
  let images = []
  let imagesFromWeb

  // Encuentra la imagen por su clase
  imagesFromWeb = await driver.findElements(By.css(element))

  // En caso de ser una publicación con una sola foto
  if (imagesFromWeb.length === 0) {
    imagesFromWeb = await driver.findElements(
      By.css(
        'img.x1ey2m1c.xds687c.x5yr21d.x10l6tqk.x17qophe.x13vifvy.xh8yej3.xl1xv1r'
      )
    )
  }

  for (let image of imagesFromWeb) {
    let url = await image.getAttribute('src')
    images.push(url)
  }

  return images
}

module.exports = scrape
