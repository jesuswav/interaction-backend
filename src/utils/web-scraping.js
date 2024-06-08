const { Builder, By } = require('selenium-webdriver')

// Esperar a que la pagina termine de cargar para garantizar que exista la clase
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function scrape(url) {
  // Inicializar el navegador Selenium (asegúrate de tener el WebDriver correspondiente)
  let driver = await new Builder().forBrowser('chrome').build()

  let post = {
    post_id: '',
    description: '',
    likes: '',
    shared: '',
    images: [],
  }

  const url1 = 'https://www.facebook.com/share/p/denWZ7obUeX4Kwzu/'
  const url2 =
    'https://www.facebook.com/linda.ruiz.54738/posts/pfbid02S3NGmbQn23WF4J6gaYq6sxREDnsiCjbkAWPaiuzw5kiyDcBXCQ9z88oN7XmtGvPl'
  const url3 = 'https://www.facebook.com/share/p/E7ek6b1qzTR9racG/'

  try {
    // Abre una página web
    await driver.get(url)

    await sleep(2000)

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

    // Imprime el valor de 'src'
    console.log('Post info:', post)

    return post
  } catch (error) {
    console.error('Error:', error)
  } finally {
    // Cierra el navegador
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

  // Comprobamos si la publicación tiene más de mil likes
  const thousands = likes.slice(-3)

  // Obtenemos solo el número de likes, evitanto la nomenclatura
  let likesNumber = parseInt(likes.match(/\d+/g).join(''))

  // En caso de tener > 1000 likes multiplicamos por mil, el número que nos da la regular expression
  if (thousands === 'mil') {
    likesNumber = likesNumber * 1000
    console.log('Holaaaaaa')
  }

  return likesNumber
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
