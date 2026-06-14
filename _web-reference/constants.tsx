
import { Product, Event, FoodService, Partner } from './types';

export const EVENTS: Event[] = [
  {
    id: 'e-main',
    title: 'Бонусная программа',
    date: 'Сезон 1: Активен',
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2044&auto=format&fit=crop',
    description: 'Собирайте бонусы каждый день, в городе, у партнёров, за заказы и приглашения друзей.',
    tag: 'АКТИВНЫЙ ИВЕНТ'
  },
  {
    id: 'e1',
    title: 'Cyber Summer Fest',
    date: '15 Июня - 30 Августа',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop',
    description: 'Самый большой фестиваль электронной музыки и технологий.',
    tag: 'Скоро'
  }
];

export const DEFAULT_FOOD_SERVICES: FoodService[] = [
  {
    id: 's1',
    name: 'Pizza Hut',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop',
    logo: '🍕',
    rating: 4.8,
    deliveryTime: '20-35 мин',
    deliveryPrice: 0,
    description: 'Легендарная пицца с пылу с жару.',
    hasPromotion: true,
    foodCategories: ['Пицца', 'Итальянская']
  },
  {
    id: 's2',
    name: 'Sushi Wok',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=2070&auto=format&fit=crop',
    logo: '🍣',
    rating: 4.6,
    deliveryTime: '30-50 мин',
    deliveryPrice: 200,
    description: 'Свежие роллы и вок для вашего удовольствия.',
    hasPromotion: false,
    foodCategories: ['Японская', 'Суши']
  },
  {
    id: 's3',
    name: 'Burger King',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop',
    logo: '🍔',
    rating: 4.5,
    deliveryTime: '15-25 мин',
    deliveryPrice: 99,
    description: 'Вкус правильного гриля.',
    hasPromotion: true,
    foodCategories: ['Бургеры', 'Фастфуд']
  }
];

export const FOOD_ITEMS: Product[] = [
  {
    id: 'f1',
    name: 'Пепперони Классика',
    price: 850,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=1480&auto=format&fit=crop',
    category: 'Пицца',
    description: 'Томатный соус, моцарелла, пепперони.',
    type: 'food',
    serviceId: 's1',
    availableVariants: ['20 см', '25 см', '30 см', '35 см'],
    nutrition: {
      kcal: 280,
      protein: 12,
      fat: 14,
      carbs: 26
    }
  },
  {
    id: 'f2',
    name: 'Филадельфия Лайт',
    price: 590,
    image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1450&auto=format&fit=crop',
    category: 'Роллы',
    description: 'Лосось, сливочный сыр, огурец.',
    type: 'food',
    serviceId: 's2',
    nutrition: {
      kcal: 195,
      protein: 8,
      fat: 9,
      carbs: 21
    }
  },
  {
    id: 'f3',
    name: 'Воппер с сыром',
    price: 350,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1599&auto=format&fit=crop',
    category: 'Бургеры',
    description: 'Легендарный бургер с говядиной на гриле, сыром, свежими овощами и фирменным соусом.',
    type: 'food',
    serviceId: 's3',
    availableVariants: ['Стандарт', 'Двойной', 'Тройной'],
    nutrition: { kcal: 650, protein: 28, fat: 35, carbs: 49 }
  },
  {
    id: 'f4',
    name: 'Маргарита',
    price: 650,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=1469&auto=format&fit=crop',
    category: 'Пицца',
    description: 'Традиционная итальянская пицца с томатным соусом, моцареллой и свежим базиликом.',
    type: 'food',
    serviceId: 's1',
    availableVariants: ['20 см', '25 см', '30 см', '35 см'],
    nutrition: { kcal: 220, protein: 10, fat: 10, carbs: 28 }
  },
  {
    id: 'f5',
    name: 'Вок со свининой терияки',
    price: 480,
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=1413&auto=format&fit=crop',
    category: 'Вок',
    description: 'Пшеничная лапша удон, свинина, овощи микс, соус терияки, кунжут.',
    type: 'food',
    serviceId: 's2',
    availableVariants: ['Стандартная', 'Большая'],
    nutrition: { kcal: 410, protein: 18, fat: 15, carbs: 55 }
  },
  {
    id: 'f6',
    name: 'Сет "Филадельфия"',
    price: 1450,
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=1527&auto=format&fit=crop',
    category: 'Роллы',
    description: 'Большой сет из 24 роллов с лососем, угрем и сливочным сыром.',
    type: 'food',
    serviceId: 's2',
    nutrition: { kcal: 850, protein: 35, fat: 40, carbs: 90 }
  },
  {
    id: 'f7',
    name: 'Чизбургер',
    price: 190,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1530&auto=format&fit=crop',
    category: 'Бургеры',
    description: 'Классический чизбургер с говяжьей котлетой, сыром чеддер, маринованными огурчиками и кетчупом.',
    type: 'food',
    serviceId: 's3',
    availableVariants: ['Стандарт', 'Двойной'],
    nutrition: { kcal: 300, protein: 15, fat: 12, carbs: 33 }
  },
  {
    id: 'f8',
    name: 'Пицца "4 Сыра"',
    price: 790,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop',
    category: 'Пицца',
    description: 'Моцарелла, чеддер, пармезан и дор блю на тонком тесте.',
    type: 'food',
    serviceId: 's1',
    availableVariants: ['20 см', '25 см', '30 см', '35 см'],
    nutrition: { kcal: 320, protein: 14, fat: 18, carbs: 25 }
  }
];

export const DEFAULT_PARTNERS: Partner[] = [
  {
    id: 'p1',
    name: 'Альфа-Банк',
    icon: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=200&auto=format&fit=crop',
    url: 'https://alfabank.ru',
    code: 'ALFA500',
    bonus: 500,
    type: 'tg'
  },
  {
    id: 'p2',
    name: 'Яндекс Плюс',
    icon: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=200&auto=format&fit=crop',
    url: 'https://t.me/yandexplus',
    code: 'PLUS200',
    bonus: 200,
    type: 'tg'
  }
];

export const MARKET_ITEMS: Product[] = [
  { 
    id: 'm1', 
    name: 'Air Jordan 1 Retro High OG', 
    price: 18999, 
    image: 'https://images.unsplash.com/photo-1600269452121-4f2416755c48?w=800&q=80', 
    category: 'Кроссовки', 
    description: 'Iconic Chicago colorway.', 
    type: 'market', 
    brand: 'Jordan', 
    series: 'Retro', 
    gender: 'Unisex', 
    availableVariants: ['40', '41.5', '43', '44', '45'],
    sku: 'AJ1-555088-101',
    color: 'White/Varsity Red-Black'
  },
  { 
    id: 'm13', 
    name: 'Nike Air Force 1 "Triple White"', 
    price: 11990, 
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80', 
    category: 'Кроссовки', 
    description: 'Uptowns.', 
    type: 'market', 
    brand: 'Nike', 
    series: 'Air Force 1', 
    gender: 'Unisex', 
    availableVariants: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
    sku: 'CW2288-111',
    color: 'White/White'
  },
  { 
    id: 'm14', 
    name: 'New Balance 550 "White Green"', 
    price: 14500, 
    image: 'https://images.unsplash.com/photo-1664478546384-d57ffe74a78c?q=80&w=1470&auto=format&fit=crop', 
    category: 'Кроссовки', 
    description: 'Классический баскетбольный силуэт 80-х годов, переосмысленный для современных улиц.', 
    type: 'market', 
    brand: 'New Balance', 
    series: '550', 
    gender: 'Unisex', 
    availableVariants: ['38', '39', '40', '41', '42', '43', '44'],
    sku: 'BB550WT1',
    color: 'White/Green'
  },
  { 
    id: 'm15', 
    name: 'Adidas Yeezy Boost 350 V2', 
    price: 28990, 
    image: 'https://images.unsplash.com/photo-1588099768531-a72d4a198538?q=80&w=1470&auto=format&fit=crop', 
    category: 'Кроссовки', 
    description: 'Культовая модель от Канье Уэста с технологией амортизации Boost.', 
    type: 'market', 
    brand: 'Adidas', 
    series: 'Yeezy', 
    gender: 'Unisex', 
    availableVariants: ['41', '42', '42.5', '43', '44', '45'],
    sku: 'CP9652',
    color: 'Core Black/Red'
  },
  { id: 'm16', name: 'iPhone 15 Pro Max', price: 129999, image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=2070&auto=format&fit=crop', category: 'Smartphones', description: 'Titanium design.', type: 'market' },
  { id: 'm17', name: 'AirPods Pro 2', price: 24990, image: 'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?q=80&w=1471&auto=format&fit=crop', category: 'Smartphones', description: 'Активное шумоподавление нового поколения и пространственное аудио.', type: 'market' },
  { id: 'g1', name: 'Брелок Sneaker Mini AJ1', price: 890, image: 'https://images.unsplash.com/photo-1594932224828-b4b05a206c9b?w=400&q=80', category: 'Mini-Gifts', description: 'Collectible sneaker keychain.', type: 'market' },
  { 
    id: 'm18', 
    name: 'Nike Dunk Low "Panda"', 
    price: 13500, 
    image: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=1470&auto=format&fit=crop', 
    category: 'Кроссовки', 
    description: 'Самая популярная расцветка классических Dunk Low.', 
    type: 'market', 
    brand: 'Nike', 
    series: 'Dunk', 
    gender: 'Unisex', 
    availableVariants: ['36', '37', '38', '39', '40', '41', '42', '43', '44'],
    sku: 'DD1391-100',
    color: 'White/Black'
  },
  { 
    id: 'm19', 
    name: 'Apple Watch Series 9', 
    price: 45990, 
    image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?q=80&w=1471&auto=format&fit=crop', 
    category: 'Smartphones', 
    description: 'Умные часы с новым процессором S9 и жестом двойного касания.', 
    type: 'market' 
  },
  { 
    id: 'm20', 
    name: 'Sony PlayStation 5', 
    price: 55990, 
    image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=1474&auto=format&fit=crop', 
    category: 'Electronics', 
    description: 'Игровая консоль нового поколения с невероятной графикой и скоростью.', 
    type: 'market' 
  }
];
