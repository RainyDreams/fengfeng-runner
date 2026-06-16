const imageList = [
  { name: 'player',           src: '/images/fengfeng.png' },
  { name: 'bg_sky',           src: '/images/bg_sky.png' },
  { name: 'bg_hills',         src: '/images/bg_hills.png' },

  { name: 'can_opened',       src: '/images/meta/sprite_can_opened.png' },
  { name: 'can_exploding',    src: '/images/meta/sprite_can_exploding.png' },
  { name: 'bottle',           src: '/images/meta/sprite_bottle.png' },
  { name: 'bottle_fizzing',   src: '/images/meta/sprite_bottle_fizzing.png' },
  { name: 'bottles_stacked',  src: '/images/meta/sprite_bottles_stacked.png' },
  { name: 'bottles_cross',    src: '/images/meta/sprite_bottles_cross.png' },
  { name: 'bottle_exploding', src: '/images/meta/sprite_bottle_exploding.png' },
  { name: 'cola_exploding',   src: '/images/meta/joy_cola_can_exploding.png' },
  { name: 'drink_container',  src: '/images/meta/sprite_drink_container.png' },
  { name: 'ice_cream_holder', src: '/images/meta/ice_cream_holder.png' },

  { name: 'ice_cream_bar',    src: '/images/meta/chocolate_ice_cream_bar.png' },
  { name: 'ice_cream_cone',   src: '/images/meta/chocolate_ice_cream_cone.png' },
  { name: 'cornetto',         src: '/images/meta/cornetto_ice_cream_package.png' },
  { name: 'ice_cream_stack',  src: '/images/meta/ice_cream_bars_stack.png' },
  { name: 'mango_bars',       src: '/images/meta/mango_ice_cream_bars.png' },
  { name: 'ice_cream_broken', src: '/images/meta/ice_cream_bars_broken.png' },

  { name: 'grass_block',      src: '/images/meta/grass_block.png' },
  { name: 'green_crate',      src: '/images/meta/green_crate.png' },
  { name: 'cookie',           src: '/images/meta/cookie_book_item.png' },
  { name: 'golden_potion',    src: '/images/meta/golden_potion_flask.png' },
  { name: 'loot_box',         src: '/images/meta/mystery_loot_box.png' },
  { name: 'golden_wrappers',  src: '/images/meta/ice_cream_wrappers_golden.png' }
]

export const TOTAL_IMAGES = imageList.length

const cache = {}
let loaded = 0

export function loadImages(onProgress) {
  imageList.forEach(item => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = img.onerror = () => {
      if (img.complete && img.naturalWidth > 0) cache[item.name] = img
      loaded++
      onProgress?.(loaded, TOTAL_IMAGES)
    }
    img.src = item.src
  })
}

export function getImage(name) {
  return cache[name] || null
}

export function getLoadProgress() {
  return TOTAL_IMAGES === 0 ? 1 : loaded / TOTAL_IMAGES
}
