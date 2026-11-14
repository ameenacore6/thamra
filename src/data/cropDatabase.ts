import type {
  AppLanguage,
  CropLibraryItem,
  CropSection,
  DiseaseProfile,
  FarmEnvironmentSnapshot,
} from '../types/farm';

export const DISEASE_LIBRARY: DiseaseProfile[] = [
  {
    id: 'powdery_mildew',
    nameEn: 'Powdery Mildew',
    nameAr: 'البياض الدقيقي',
    type: 'fungal',
    affectedCrops: ['Tomatoes', 'Cucumbers', 'Peppers', 'Cowpea', 'Sunflower', 'Cabbage'],
    symptomsEn: 'White powdery patches on upper leaf surfaces, curling leaves, and reduced fruit vigor.',
    symptomsAr: 'بقع بيضاء تشبه الدقيق على سطح الأوراق العلوي مع التفاف الأوراق وضعف الثمار.',
    causesEn: 'Fungal spores spreading rapidly in warm days combined with humid nights and dense foliage.',
    causesAr: 'فطريات تنتشر سريعاً مع الأيام الدافئة والليالي الرطبة وتزاحم الأوراق.',
    riskConditionsEn: 'Relative humidity 60–85% with moderate-to-warm air temperatures (20–32°C) and poor airflow.',
    riskConditionsAr: 'رطوبة نسبية 60–85% مع حرارة معتدلة إلى دافئة (20–32°م) وقلة التهوية.',
    humidityTriggerMin: 60,
    tempTriggerMin: 18,
    tempTriggerMax: 34,
    preventionEn: 'Space plants for airflow, water at root level in the morning, and rotate away from susceptible cucurbits/solanaceae.',
    preventionAr: 'توسيع المسافات للتهوية، والري عند الجذور صباحاً، وتطبيق الدورة الزراعية بعيداً عن العائلات الحساسة.',
    managementEn: 'Prune heavily infected lower leaves early and consult a local Bahrain agricultural extension officer before applying approved sulfur or bio-fungicides.',
    managementAr: 'تقليم الأوراق السفلية المصابة مبكراً ومراجعة الإرشاد الزراعي قبل استخدام المبيدات الفطرية المعتمدة.',
  },
  {
    id: 'early_blight',
    nameEn: 'Early Blight (Alternaria)',
    nameAr: 'اللفحة المبكرة (ألترناريا)',
    type: 'fungal',
    affectedCrops: ['Tomatoes', 'Potatoes', 'Peppers', 'Eggplant'],
    symptomsEn: 'Dark brown concentric rings ("target spots") on older leaves, yellowing margins, and premature leaf drop.',
    symptomsAr: 'بقع بنية داكنة ذات حلقات متداخلة على الأوراق السفلية القديمة يتبعها اصفرار وتساقط.',
    causesEn: 'Soil-borne fungus surviving on Solanaceae crop residue, splashed onto leaves by overhead watering or rain.',
    causesAr: 'فطر يعيش في بقايا المحاصيل الباذنجانية وينتقل للأوراق عبر رذاذ الري أو الأمطار.',
    riskConditionsEn: 'Warm weather (24–30°C) paired with morning dew, high humidity (>65%), or wet foliage.',
    riskConditionsAr: 'طقس دافئ (24–30°م) مع ندى صباحي أو رطوبة مرتفعة (>65%) أو بلل الأوراق.',
    humidityTriggerMin: 65,
    tempTriggerMin: 22,
    tempTriggerMax: 33,
    preventionEn: 'Never plant Tomatoes, Potatoes, or Peppers back-to-back; rotate with cereals (Barley/Sorghum) or legumes (Cowpea) for 2–3 seasons.',
    preventionAr: 'عدم زراعة الطماطم والبطاطس والفلفل بشكل متتالي؛ بل تدويرها مع الحبوب أو البقوليات لموسمين أو ثلاثة.',
    managementEn: 'Remove infected debris after harvest, use drip irrigation instead of sprinklers, and mulch soil surface.',
    managementAr: 'إزالة المخلفات المصابة بعد الحصاد، واستخدام الري بالتنقيط بدلاً من الرش، وتغطية سطح التربة.',
  },
  {
    id: 'whitefly_tylc',
    nameEn: 'Silverleaf Whitefly & Viral Stress',
    nameAr: 'الذبابة البيضاء وتجعد الأوراق',
    type: 'pest',
    affectedCrops: ['Tomatoes', 'Cucumbers', 'Peppers', 'Cowpea', 'Okra'],
    symptomsEn: 'Tiny white flies under leaves, sticky honeydew, upward leaf curling, and stunted yellow new shoots.',
    symptomsAr: 'حشرات بيضاء دقيقة أسفل الأوراق، ندوة عسلية لزجة، التفاف الأوراق لأعلى وتقزم القمم.',
    causesEn: 'Sap-sucking whiteflies thriving in dry-to-warm Gulf transition seasons and transmitting leaf-curl viruses.',
    causesAr: 'حشرات ثاقبة ماصة تنشط في الفترات الدافئة وتنقل فيروسات تجعد الأوراق.',
    riskConditionsEn: 'Warm-to-hot temperatures (26–39°C), low rainfall, and continuous host cropping without breaks.',
    riskConditionsAr: 'حرارة دافئة إلى مرتفعة (26–39°م) وجفاف مع استمرار زراعة نفس العائل دون فترة راحة.',
    tempTriggerMin: 25,
    preventionEn: 'Use fine insect-proof netting on nurseries, yellow sticky traps, and break host cycles with Barley or Onion.',
    preventionAr: 'استخدام شباك حشرية دقيقة للمشاتل ومصائد صفراء لاصقة وكسر دورة العائل بالشعير أو البصل.',
    managementEn: 'Monitor undersides of young leaves weekly and coordinate safe biological or extension-approved controls.',
    managementAr: 'فحص أسفل الأوراق الحديثة أسبوعياً وتطبيق المكافحة الحيوية أو الموصى بها زراعياً.',
  },
  {
    id: 'red_palm_weevil',
    nameEn: 'Red Palm Weevil Risk',
    nameAr: 'سوسة النخيل الحمراء',
    type: 'pest',
    affectedCrops: ['Date Palms'],
    symptomsEn: 'Oozing brownish sap on palm trunk, chewed fibers near offshoots, or wilting central crown fronds.',
    symptomsAr: 'خروج إفرازات بنية من جذع النخلة أو ألياف ممضوغة قرب الفسائل أو ذبول القلب.',
    causesEn: 'Boring weevil attracted to fresh pruning wounds and moist trunk bases.',
    causesAr: 'حشرة ثاقبة تنجذب لجروح التقليم الطازجة وقواعد الجذوع الرطبة.',
    riskConditionsEn: 'Year-round risk in Bahrain, elevated after unsealed frond pruning or excessive moisture around trunk collar.',
    riskConditionsAr: 'خطر مستمر في البحرين يزداد بعد التقليم غير المعقم أو تراكم الرطوبة حول قاعدة الجذع.',
    preventionEn: 'Seal pruning cuts immediately, keep trunk bases clean and dry, and use pheromone monitoring traps.',
    preventionAr: 'تعقيم وتغطية جروح التقليم فوراً، وإبقاء قاعدة الجذع جافة ونظيفة، ونشر المصائد الفرمونية.',
    managementEn: 'Report suspected palms promptly to Bahrain Ministry agricultural pest control teams for trunk inspection.',
    managementAr: 'إبلاغ فرق مكافحة الآفات بوزارة الزراعة فوراً لفحص الجذوع المشتبه بإصابتها.',
  },
  {
    id: 'root_knot_nematode',
    nameEn: 'Root-Knot Nematode & Soil Fatigue',
    nameAr: 'نيماتودا تعقد الجذور وإجهاد التربة',
    type: 'pest',
    affectedCrops: ['Tomatoes', 'Potatoes', 'Cucumbers', 'Carrot', 'Peppers'],
    symptomsEn: 'Midday wilting even when soil is moist, patchy yellow growth, and small galls/knots on roots.',
    symptomsAr: 'ذبول النبات ظهراً رغم رطوبة التربة، وضعف النمو على شكل بقع، مع عقد صغيرة على الجذور.',
    causesEn: 'Microscopic soil nematodes building up in sandy Bahraini soils under repeated Solanaceae or Cucurbit crops.',
    causesAr: 'ديدان خيطية مجهرية تتكاثر في التربة الرملية البحرينية عند تكرار المحاصيل الباذنجانية أو القرعية.',
    riskConditionsEn: 'Warm sandy soils (25–35°C) with repeated susceptible crops and low organic matter.',
    riskConditionsAr: 'التربة الرملية الدافئة (25–35°م) مع غياب الدورة الزراعية وقلة المادة العضوية.',
    tempTriggerMin: 24,
    preventionEn: 'Rotate strictly with Sorghum, Pearl millet, Onion, or Marigold/compost incorporation and summer solarization.',
    preventionAr: 'التدوير مع الذرة الرفيعة أو الدخن أو البصل وإضافة السماد العضوي والتعقيم الشمسي صيفاً.',
    managementEn: 'Add well-composted organic matter to boost soil biology and avoid moving soil between infected sections.',
    managementAr: 'إضافة كمبوست متحلل جيداً لتنشيط التربة ومنع نقل التربة والأدوات بين الأقسام.',
  },
  {
    id: 'heat_salinity_stress',
    nameEn: 'Heat & Salinity Scorch (Abiotic)',
    nameAr: 'إجهاد الحرارة والملوحة (غير مرضي)',
    type: 'abiotic',
    affectedCrops: ['Tomatoes', 'Lettuce', 'Potatoes', 'Cucumbers', 'Peppers', 'Barley'],
    symptomsEn: 'Crispy brown leaf edges, blossom drop in tomatoes, and slowed root uptake during hot afternoon winds.',
    symptomsAr: 'احتراق حواف الأوراق باللون البني، تساقط أزهار الطماطم، وبطء الامتصاص أثناء الرياح الحارة.',
    causesEn: 'High vapor pressure deficit (VPD), intense solar radiation, and brackish irrigation salt accumulation.',
    causesAr: 'ارتفاع العجز البخاري (VPD)، والإشعاع الشمسي الشديد، وتراكم الأملاح من مياه الري.',
    riskConditionsEn: 'Air temperatures above 35°C, high solar load (>20 MJ/m²/day), or dry surface SMAP/POWER moisture.',
    riskConditionsAr: 'حرارة تتجاوز 35°م وإشعاع شمسي مرتفع (>20 ميجاجول/م²) أو انخفاض رطوبة التربة.',
    tempTriggerMin: 35,
    preventionEn: 'Irrigate early morning or dusk, use shade nets (30–40%) for tender greens, and flush salts periodically.',
    preventionAr: 'الري فجراً أو مساءً، واستخدام شباك التظليل للورقيات، وغسل الأملاح بشكل دوري مدروس.',
    managementEn: 'Adjust irrigation split cycles based on SMAP/POWER moisture and switch summer fallow sections to heat-hardy Cowpea or Sorghum.',
    managementAr: 'تقسيم دفعات الري حسب بيانات ناسا وزراعة اللوبيا أو الذرة المقاومة للحرارة في الصيف.',
  },
];

export const CROP_LIBRARY: CropLibraryItem[] = [
  {
    id: 'tomatoes',
    nameEn: 'Tomatoes',
    nameAr: 'طماطم',
    scientificName: 'Solanum lycopersicum',
    botanicalFamily: 'Solanaceae',
    category: 'vegetable',
    rotationGroup: 'Solanaceous crop',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Cool-to-warm Bahrain autumn/winter (Oct–Apr); suffers blossom drop above 35°C.',
    climateAr: 'موسم البحرين المعتدل (أكتوبر–أبريل)؛ تتساقط الأزهار فوق 35°م.',
    tempMinC: 15,
    tempMaxC: 33,
    optimalSoilEn: 'Well-drained sandy loam enriched with compost, pH 6.0–7.0.',
    optimalSoilAr: 'تربة رملية طينية جيدة الصرف غنية بالكمبوست، حموضة 6.0–7.0.',
    waterDemand: 'Moderate to high',
    sunlightEn: 'Full sun (6–8 hrs/day); light shade mesh helpful late spring.',
    sunlightAr: 'شمس كاملة (6–8 ساعات) مع تظليل خفيف أواخر الربيع.',
    plantingSeasonEn: 'Sep – Feb (Bahrain field) / Year-round protected net-house',
    plantingSeasonAr: 'سبتمبر – فبراير (مكشوف) / طوال العام في البيوت المحمية',
    growthDurationDays: '75–100 days',
    nutrientNeedsEn: 'Heavy feeder (Nitrogen early, high Potassium & Calcium during fruiting).',
    nutrientNeedsAr: 'مستهلك عالٍ للعناصر (نيتروجين بالبداية ثم بوتاسيوم وكالسيوم وقت الإثمار).',
    commonPestIds: ['early_blight', 'whitefly_tylc', 'root_knot_nematode', 'heat_salinity_stress'],
    preventionTipsEn: 'Drip irrigate at base; rotate away from Potatoes/Peppers for at least 2 seasons.',
    preventionTipsAr: 'استخدم الري بالتنقيط وتجنب تكراره بعد البطاطس أو الفلفل لموسمين.',
    companionCrops: ['Onion', 'Basil / Herbs', 'Carrot', 'Cowpea'],
    unsuitableFollowers: ['Potatoes', 'Peppers', 'Eggplant'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Has favourable suitability (Irrigated)',
  },
  {
    id: 'potatoes',
    nameEn: 'Potatoes',
    nameAr: 'بطاطس',
    scientificName: 'Solanum tuberosum',
    botanicalFamily: 'Solanaceae',
    category: 'root',
    rotationGroup: 'Solanaceous crop',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Cool Bahrain winter crop; tubers bulk best at 16–25°C.',
    climateAr: 'محصول شتوي في البحرين؛ تتكون الدرنات بأفضل صورة بين 16–25°م.',
    tempMinC: 12,
    tempMaxC: 28,
    optimalSoilEn: 'Loose, deep sandy loam free of crusting so tubers expand cleanly.',
    optimalSoilAr: 'تربة رملية خفيفة عميقة غير متماسكة لنمو الدرنات.',
    waterDemand: 'Moderate to high',
    sunlightEn: 'Full winter sun.',
    sunlightAr: 'شمس شتوية كاملة.',
    plantingSeasonEn: 'Oct – Jan',
    plantingSeasonAr: 'أكتوبر – يناير',
    growthDurationDays: '90–115 days',
    nutrientNeedsEn: 'Heavy Potassium & Phosphorus user; avoid excess fresh manure.',
    nutrientNeedsAr: 'يحتاج بوتاسيوم وفوسفور عالٍ؛ تجنب السماد غير المتحلل.',
    commonPestIds: ['early_blight', 'root_knot_nematode', 'heat_salinity_stress'],
    preventionTipsEn: 'Follow nitrogen-fixing Cowpea or Chickpea and follow after with Barley or Sorghum.',
    preventionTipsAr: 'ازرعه بعد البقوليات (اللوبيا أو الحمص) واتبعه بالشعير أو الذرة الرفيعة.',
    companionCrops: ['Cowpea', 'Chickpea', 'Cabbage', 'Barley'],
    unsuitableFollowers: ['Tomatoes', 'Peppers', 'Eggplant'],
    bahrainGaEzExtentPct: 54.25,
    bahrainSuitabilityTier: 'Has favourable suitability (Irrigated)',
  },
  {
    id: 'wheat',
    nameEn: 'Wheat',
    nameAr: 'قمح',
    scientificName: 'Triticum aestivum',
    botanicalFamily: 'Poaceae',
    category: 'cereal',
    rotationGroup: 'Cereal or grass',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Cool winter season; grain filling needs moderate temperatures before spring heat.',
    climateAr: 'موسم الشتاء المعتدل؛ يحتاج حرارة معتدلة قبل حر الربيع.',
    tempMinC: 10,
    tempMaxC: 30,
    optimalSoilEn: 'Sandy loam to clay loam with good leveling for uniform irrigation.',
    optimalSoilAr: 'تربة رملية طينية مستوية لتوزيع مياه الري بانتظام.',
    waterDemand: 'Low to moderate',
    sunlightEn: 'Full sun.',
    sunlightAr: 'شمس كاملة.',
    plantingSeasonEn: 'Nov – Dec',
    plantingSeasonAr: 'نوفمبر – ديسمبر',
    growthDurationDays: '110–130 days',
    nutrientNeedsEn: 'Moderate Nitrogen feeder; benefits from following a legume crop.',
    nutrientNeedsAr: 'احتياج متوسط للنيتروجين؛ يزدهر بعد محصول بقولي.',
    commonPestIds: ['heat_salinity_stress'],
    preventionTipsEn: 'Breaks tomato and potato soil-borne fungal and nematode cycles effectively.',
    preventionTipsAr: 'يكسر دورة الفطريات والنيماتودا الخاصة بالطماطم والبطاطس بفاعلية.',
    companionCrops: ['Chickpea', 'Cowpea', 'Tomatoes', 'Potatoes'],
    unsuitableFollowers: ['Barley', 'Sorghum', 'Pearl millet'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Very suitable area available (Irrigated)',
  },
  {
    id: 'barley',
    nameEn: 'Barley',
    nameAr: 'شعير',
    scientificName: 'Hordeum vulgare',
    botanicalFamily: 'Poaceae',
    category: 'cereal',
    rotationGroup: 'Cereal or grass',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Well suited to Bahrain winter climate with superior salinity tolerance vs wheat.',
    climateAr: 'مناسب جداً لشتاء البحرين ويتميز بتحمل أفضل للملوحة مقارنة بالقمح.',
    tempMinC: 8,
    tempMaxC: 31,
    optimalSoilEn: 'Tolerates sandy and moderately saline Bahraini soils.',
    optimalSoilAr: 'يتحمل التربة الرملية ومتوسطة الملوحة في البحرين.',
    waterDemand: 'Low to moderate',
    sunlightEn: 'Full sun.',
    sunlightAr: 'شمس كاملة.',
    plantingSeasonEn: 'Nov – Jan',
    plantingSeasonAr: 'نوفمبر – يناير',
    growthDurationDays: '95–115 days',
    nutrientNeedsEn: 'Light-to-moderate Nitrogen; strong fibrous roots improve soil structure.',
    nutrientNeedsAr: 'احتياج خفيف إلى متوسط؛ جذوره الليفية تحسن بنية التربة.',
    commonPestIds: ['heat_salinity_stress'],
    preventionTipsEn: 'Ideal winter rotation partner before Cowpea or after White potato.',
    preventionTipsAr: 'شريك مثالي في الدورة الشتوية قبل اللوبيا أو بعد البطاطس.',
    companionCrops: ['Cowpea', 'Chickpea', 'Sunflower', 'Potatoes'],
    unsuitableFollowers: ['Wheat', 'Sorghum', 'Pearl millet'],
    bahrainGaEzExtentPct: 54.25,
    bahrainSuitabilityTier: 'Very suitable area available (Irrigated)',
  },
  {
    id: 'lettuce',
    nameEn: 'Lettuce',
    nameAr: 'خس',
    scientificName: 'Lactuca sativa',
    botanicalFamily: 'Asteraceae',
    category: 'vegetable',
    rotationGroup: 'Other family',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Strictly cool-season in Bahrain (Nov–Mar); bolts and turns bitter in heat.',
    climateAr: 'محصول شتوي بحت في البحرين (نوفمبر–مارس)؛ يزهر ويمرر مع الحرارة.',
    tempMinC: 10,
    tempMaxC: 24,
    optimalSoilEn: 'Moist, fertile sandy loam rich in organic compost.',
    optimalSoilAr: 'تربة رطبة خصبة غنية بالكمبوست العضوي.',
    waterDemand: 'Moderate to high',
    sunlightEn: 'Full winter sun or 30% shade cloth in shoulder months.',
    sunlightAr: 'شمس شتوية أو تظليل 30% في بداية ونهاية الموسم.',
    plantingSeasonEn: 'Nov – Feb',
    plantingSeasonAr: 'نوفمبر – فبراير',
    growthDurationDays: '45–65 days',
    nutrientNeedsEn: 'Steady Nitrogen for crisp leaf formation; shallow root irrigation.',
    nutrientNeedsAr: 'نيتروجين متوازن لنمو الأوراق مع ري سطحي منتظم.',
    commonPestIds: ['powdery_mildew', 'heat_salinity_stress'],
    preventionTipsEn: 'Keep topsoil cool and evenly moist; avoid high salinity water.',
    preventionTipsAr: 'حافظ على رطوبة الطبقة السطحية وتجنب المياه عالية الملوحة.',
    companionCrops: ['Carrot', 'Onion', 'Cowpea'],
    unsuitableFollowers: ['Sunflower'],
    bahrainGaEzExtentPct: null,
    bahrainSuitabilityTier: 'Seasonal winter leafy crop (Net-house / cool season)',
  },
  {
    id: 'cucumbers',
    nameEn: 'Cucumbers',
    nameAr: 'خيار',
    scientificName: 'Cucumis sativus',
    botanicalFamily: 'Cucurbitaceae',
    category: 'cucurbit' as unknown as CropLibraryItem['category'],
    rotationGroup: 'Cucurbit',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Thrives in warm protected houses or mild Bahrain autumn/spring.',
    climateAr: 'ينجح في البيوت المحمية أو فصلي الخريف والربيع المعتدلين.',
    tempMinC: 18,
    tempMaxC: 34,
    optimalSoilEn: 'Loose, organically rich sandy loam with fast drainage.',
    optimalSoilAr: 'تربة رملية غنية بالمادة العضوية وسريعة الصرف.',
    waterDemand: 'High',
    sunlightEn: 'Full sun with afternoon wind protection.',
    sunlightAr: 'شمس كاملة مع حماية من الرياح الجافة.',
    plantingSeasonEn: 'Sep – Nov & Feb – Apr',
    plantingSeasonAr: 'سبتمبر – نوفمبر وفبراير – أبريل',
    growthDurationDays: '50–65 days',
    nutrientNeedsEn: 'High continuous feeder (N-P-K balanced drip fertigation).',
    nutrientNeedsAr: 'استهلاك عالٍ ومتواصل للعناصر عبر التسميد بالتنقيط.',
    commonPestIds: ['powdery_mildew', 'whitefly_tylc', 'root_knot_nematode', 'heat_salinity_stress'],
    preventionTipsEn: 'Trellis vines vertically to cut mildew pressure; rotate with legumes or cereals.',
    preventionTipsAr: 'تربية النبات رأسياً لتقليل البياض الدقيقي والتدوير مع البقوليات أو الحبوب.',
    companionCrops: ['Cowpea', 'Onion', 'Sorghum'],
    unsuitableFollowers: ['Watermelon'],
    bahrainGaEzExtentPct: null,
    bahrainSuitabilityTier: 'Protected / mild-season irrigated crop',
  },
  {
    id: 'peppers',
    nameEn: 'Peppers',
    nameAr: 'فلفل',
    scientificName: 'Capsicum annuum',
    botanicalFamily: 'Solanaceae',
    category: 'vegetable',
    rotationGroup: 'Solanaceous crop',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Warm season crop; sensitive to extreme summer sunburn without shade net.',
    climateAr: 'محصول دافئ؛ يتأثر بلسعة الشمس في الصيف دون تظليل.',
    tempMinC: 16,
    tempMaxC: 35,
    optimalSoilEn: 'Well-drained sandy loam, moderate salinity sensitivity.',
    optimalSoilAr: 'تربة رملية طينية جيدة الصرف حساسة لارتفاع الملوحة.',
    waterDemand: 'Moderate',
    sunlightEn: 'Full sun / 30% shade in late spring.',
    sunlightAr: 'شمس كاملة أو تظليل 30% في الربيع المتأخر.',
    plantingSeasonEn: 'Sep – Feb',
    plantingSeasonAr: 'سبتمبر – فبراير',
    growthDurationDays: '70–90 days',
    nutrientNeedsEn: 'Balanced Nitrogen + Calcium/Potassium for firm fruit walls.',
    nutrientNeedsAr: 'توازن بين النيتروجين والكالسيوم والبوتاسيوم لصلابة الثمار.',
    commonPestIds: ['early_blight', 'whitefly_tylc', 'root_knot_nematode'],
    preventionTipsEn: 'Do not follow Tomatoes or Potatoes; rotate with legumes or brassicas.',
    preventionTipsAr: 'لا تزرعه بعد الطماطم أو البطاطس؛ دوره مع البقوليات أو الصليبيات.',
    companionCrops: ['Onion', 'Carrot', 'Cowpea'],
    unsuitableFollowers: ['Tomatoes', 'Potatoes', 'Eggplant'],
    bahrainGaEzExtentPct: null,
    bahrainSuitabilityTier: 'Mild-season / protected irrigated crop',
  },
  {
    id: 'date_palms',
    nameEn: 'Date Palms',
    nameAr: 'نخيل التمر',
    scientificName: 'Phoenix dactylifera',
    botanicalFamily: 'Arecaceae',
    category: 'fruit',
    rotationGroup: 'Perennial / Tree',
    isLegume: false,
    isPerennial: true,
    climateEn: 'Iconic perennial crop of Bahrain; thrives in hot arid summers with deep irrigation.',
    climateAr: 'المحصول التراثي المعمر في البحرين؛ يزدهر صيفاً مع الري العميق المنتظم.',
    tempMinC: 12,
    tempMaxC: 48,
    optimalSoilEn: 'Deep sandy to silty oasis soils; tolerates moderate salinity.',
    optimalSoilAr: 'تربة عميقة من الرملية إلى الطميية مع تحمل جيد للملوحة.',
    waterDemand: 'Moderate to high',
    sunlightEn: 'Full intense desert sunlight.',
    sunlightAr: 'شمس مباشرة قوية.',
    plantingSeasonEn: 'Perennial (Offshoots planted Mar–May or Sep–Oct)',
    plantingSeasonAr: 'معمر (تُغرس الفسائل مارس–مايو أو سبتمبر–أكتوبر)',
    growthDurationDays: 'Perennial (Fruiting annually Jun–Sep)',
    nutrientNeedsEn: 'Annual organic compost + Potassium/Magnesium; avoid wet trunk collars.',
    nutrientNeedsAr: 'سماد عضوي سنوي مع بوتاسيوم ومغنيسيوم وتجفيف محيط الجذع.',
    commonPestIds: ['red_palm_weevil'],
    preventionTipsEn: 'Sanitize pruning cuts and intercrop understory alleys with Alfalfa or seasonal greens.',
    preventionTipsAr: 'تعقيم مواقع التقليم وزراعة البرسيم أو الورقيات في المساحات البينية.',
    companionCrops: ['Alfalfa', 'Cowpea', 'Citrus'],
    unsuitableFollowers: [],
    bahrainGaEzExtentPct: null,
    bahrainSuitabilityTier: 'Traditional Bahrain oasis cornerstone (Perennial)',
  },
  {
    id: 'cowpea',
    nameEn: 'Cowpea',
    nameAr: 'لوبيا',
    scientificName: 'Vigna unguiculata',
    botanicalFamily: 'Fabaceae',
    category: 'legume',
    rotationGroup: 'Legume',
    isLegume: true,
    isPerennial: false,
    climateEn: 'Heat-hardy legume ranked #1 in FieldShift Bahrain rotation combinations.',
    climateAr: 'محصول بقولي متحمل للحرارة وتصدر توصيات الدورة الزراعية للبحرين.',
    tempMinC: 20,
    tempMaxC: 40,
    optimalSoilEn: 'Adaptable sandy loam; fixes atmospheric nitrogen for the next crop.',
    optimalSoilAr: 'يتأقلم مع التربة الرملية ويثبت النيتروجين للمحصول التالي.',
    waterDemand: 'Moderate',
    sunlightEn: 'Full sun.',
    sunlightAr: 'شمس كاملة.',
    plantingSeasonEn: 'Mar – May & Aug – Sep',
    plantingSeasonAr: 'مارس – مايو وأغسطس – سبتمبر',
    growthDurationDays: '65–85 days',
    nutrientNeedsEn: 'Fixes its own Nitrogen; needs modest Phosphorus at planting.',
    nutrientNeedsAr: 'يثبت النيتروجين ذاتياً؛ يحتاج فوسفوراً معتدلاً عند الزراعة.',
    commonPestIds: ['powdery_mildew', 'whitefly_tylc'],
    preventionTipsEn: 'Excellent nitrogen-building break crop before Sorghum, White potato, or Tomatoes.',
    preventionTipsAr: 'محصول كاسر ممتاز ومثبت للنيتروجين قبل الذرة الرفيعة أو البطاطس أو الطماطم.',
    companionCrops: ['Sorghum', 'Sunflower', 'Potatoes', 'Barley'],
    unsuitableFollowers: ['Chickpea', 'Groundnut', 'Alfalfa'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Has favourable suitability (Irrigated)',
  },
  {
    id: 'chickpea',
    nameEn: 'Chickpea',
    nameAr: 'حمص',
    scientificName: 'Cicer arietinum',
    botanicalFamily: 'Fabaceae',
    category: 'legume',
    rotationGroup: 'Legume',
    isLegume: true,
    isPerennial: false,
    climateEn: 'Cool-season legume suited to Bahrain winter; low-to-moderate water need.',
    climateAr: 'بقول شتوي يناسب البحرين باحتياج مائي منخفض إلى متوسط.',
    tempMinC: 10,
    tempMaxC: 30,
    optimalSoilEn: 'Well-drained sandy loam; dislikes waterlogging.',
    optimalSoilAr: 'تربة رملية جيدة الصرف؛ لا يتحمل تغدق المياه.',
    waterDemand: 'Low to moderate',
    sunlightEn: 'Full sun.',
    sunlightAr: 'شمس كاملة.',
    plantingSeasonEn: 'Nov – Jan',
    plantingSeasonAr: 'نوفمبر – يناير',
    growthDurationDays: '95–115 days',
    nutrientNeedsEn: 'Fixes Nitrogen; improves soil fertility ahead of Barley or Potatoes.',
    nutrientNeedsAr: 'يثبت النيتروجين ويرفع خصوبة التربة قبل الشعير أو البطاطس.',
    commonPestIds: ['root_knot_nematode'],
    preventionTipsEn: 'Avoid over-irrigation; alternate with cereals and Sunflower.',
    preventionTipsAr: 'تجنب الإفراط في الري وداوره مع الحبوب ودوار الشمس.',
    companionCrops: ['Barley', 'Sunflower', 'Sorghum'],
    unsuitableFollowers: ['Cowpea', 'Groundnut', 'Alfalfa'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Has favourable suitability (Irrigated)',
  },
  {
    id: 'groundnut',
    nameEn: 'Groundnut',
    nameAr: 'فول سوداني',
    scientificName: 'Arachis hypogaea',
    botanicalFamily: 'Fabaceae',
    category: 'legume',
    rotationGroup: 'Legume',
    isLegume: true,
    isPerennial: false,
    climateEn: 'Warm-season legume suitable under reliable drip irrigation.',
    climateAr: 'بقول دافئ مناسب عند توفر الري المنتظم بالتنقيط.',
    tempMinC: 20,
    tempMaxC: 37,
    optimalSoilEn: 'Friable sandy soil allowing pegs to penetrate easily.',
    optimalSoilAr: 'تربة رملية مفككة تسمح بتكوين القرون بسهولة.',
    waterDemand: 'Moderate to high',
    sunlightEn: 'Full sun.',
    sunlightAr: 'شمس كاملة.',
    plantingSeasonEn: 'Mar – May',
    plantingSeasonAr: 'مارس – مايو',
    growthDurationDays: '105–130 days',
    nutrientNeedsEn: 'Fixes Nitrogen; requires Calcium during pod fill.',
    nutrientNeedsAr: 'يثبت النيتروجين ويحتاج كالسيوم أثناء امتلاء القرون.',
    commonPestIds: ['root_knot_nematode'],
    preventionTipsEn: 'Rotate with Sorghum or Pearl millet to suppress soil pests.',
    preventionTipsAr: 'داوره مع الذرة الرفيعة أو الدخن لكبح آفات التربة.',
    companionCrops: ['Sorghum', 'Pearl millet', 'Sunflower'],
    unsuitableFollowers: ['Cowpea', 'Chickpea'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Has favourable suitability (Irrigated)',
  },
  {
    id: 'sorghum',
    nameEn: 'Sorghum',
    nameAr: 'ذرة رفيعة',
    scientificName: 'Sorghum bicolor',
    botanicalFamily: 'Poaceae',
    category: 'cereal',
    rotationGroup: 'Cereal or grass',
    isLegume: false,
    isPerennial: false,
    climateEn: 'High heat resilience; strong warm-season cereal/forage option in Bahrain.',
    climateAr: 'تحمل ممتاز للحرارة؛ خيار قوي للحبوب والأعلاف في المواسم الحارة.',
    tempMinC: 18,
    tempMaxC: 42,
    optimalSoilEn: 'Wide tolerance from sandy loam to heavy soils.',
    optimalSoilAr: 'يتأقلم مع أنواع التربة المختلفة من الرملية إلى الطينية.',
    waterDemand: 'Moderate',
    sunlightEn: 'Full sun.',
    sunlightAr: 'شمس كاملة.',
    plantingSeasonEn: 'Mar – May & Aug – Sep',
    plantingSeasonAr: 'مارس – مايو وأغسطس – سبتمبر',
    growthDurationDays: '90–115 days',
    nutrientNeedsEn: 'Uses residual Nitrogen efficiently after Cowpea or Alfalfa.',
    nutrientNeedsAr: 'يستفيد بكفاءة من النيتروجين المتبقي بعد اللوبيا أو البرسيم.',
    commonPestIds: ['heat_salinity_stress'],
    preventionTipsEn: 'Suppresses root-knot nematodes naturally when rotated before Tomatoes or Potatoes.',
    preventionTipsAr: 'يساعد في خفض النيماتودا طبيعياً عند زراعته قبل الطماطم أو البطاطس.',
    companionCrops: ['Cowpea', 'Sunflower', 'Chickpea'],
    unsuitableFollowers: ['Barley', 'Wheat', 'Pearl millet'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Very suitable area available (Irrigated)',
  },
  {
    id: 'pearl_millet',
    nameEn: 'Pearl millet',
    nameAr: 'دخن لؤلؤي',
    scientificName: 'Cenchrus americanus',
    botanicalFamily: 'Poaceae',
    category: 'cereal',
    rotationGroup: 'Cereal or grass',
    isLegume: false,
    isPerennial: false,
    climateEn: 'High heat tolerance & low-to-moderate water demand; top water-saving cereal in FieldShift.',
    climateAr: 'تحمل عالٍ للحرارة مع احتياج مائي منخفض؛ ممتاز لترشيد المياه.',
    tempMinC: 20,
    tempMaxC: 43,
    optimalSoilEn: 'Thrives even in light sandy soils with modest fertility.',
    optimalSoilAr: 'ينمو بكفاءة حتى في التربة الرملية الخفيفة.',
    waterDemand: 'Low to moderate',
    sunlightEn: 'Full sun.',
    sunlightAr: 'شمس كاملة.',
    plantingSeasonEn: 'Mar – Jun & Aug – Sep',
    plantingSeasonAr: 'مارس – يونيو وأغسطس – سبتمبر',
    growthDurationDays: '75–95 days',
    nutrientNeedsEn: 'Low nutrient demand; builds root biomass.',
    nutrientNeedsAr: 'احتياج غذائي منخفض ويضيف كتلة جذرية جيدة للتربة.',
    commonPestIds: [],
    preventionTipsEn: 'Ideal drought-resilient summer cover or grain follow-up after legumes.',
    preventionTipsAr: 'محصول صيفي موفر للمياه بعد البقوليات.',
    companionCrops: ['Cowpea', 'Chickpea', 'Sunflower'],
    unsuitableFollowers: ['Sorghum', 'Barley', 'Wheat'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Very suitable area available (Irrigated)',
  },
  {
    id: 'sunflower',
    nameEn: 'Sunflower',
    nameAr: 'دوار الشمس',
    scientificName: 'Helianthus annuus',
    botanicalFamily: 'Asteraceae',
    category: 'oilseed',
    rotationGroup: 'Other family',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Moderate-to-high heat tolerance; pairs cleanly with Cowpea & Sorghum in Bahrain rotations.',
    climateAr: 'يتحمل الحرارة المعتدلة إلى المرتفعة ويشكل حلقة رائعة مع اللوبيا والذرة.',
    tempMinC: 15,
    tempMaxC: 36,
    optimalSoilEn: 'Deep sandy loam for taproot nutrient scavenging.',
    optimalSoilAr: 'تربة رملية طينية عميقة لجذره الوتدي.',
    waterDemand: 'Moderate',
    sunlightEn: 'Full sun.',
    sunlightAr: 'شمس كاملة.',
    plantingSeasonEn: 'Feb – Apr & Sep – Oct',
    plantingSeasonAr: 'فبراير – أبريل وسبتمبر – أكتوبر',
    growthDurationDays: '85–105 days',
    nutrientNeedsEn: 'Scavenges deep Potassium and Phosphorus.',
    nutrientNeedsAr: 'يمتص البوتاسيوم والفوسفور من الأعماق.',
    commonPestIds: ['powdery_mildew'],
    preventionTipsEn: 'Attracts pollinators that boost adjacent vegetable fruiting.',
    preventionTipsAr: 'يجذب الملقحات الطبيعية مما يحسن عقد ثمار الخضروات المجاورة.',
    companionCrops: ['Cowpea', 'Barley', 'Sorghum'],
    unsuitableFollowers: ['Lettuce'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Very suitable area available (Irrigated)',
  },
  {
    id: 'alfalfa',
    nameEn: 'Alfalfa / Forage',
    nameAr: 'برسيم / أعلاف',
    scientificName: 'Medicago sativa',
    botanicalFamily: 'Fabaceae',
    category: 'forage',
    rotationGroup: 'Legume',
    isLegume: true,
    isPerennial: true,
    climateEn: 'Widely grown Bahrain perennial forage under palm shade and irrigated plots.',
    climateAr: 'علف معمر واسع الانتشار في البحرين تحت النخيل وفي الحقول المروية.',
    tempMinC: 12,
    tempMaxC: 40,
    optimalSoilEn: 'Deep drained sandy loam; avoids waterlogged salinity.',
    optimalSoilAr: 'تربة رملية عميقة جيدة الصرف.',
    waterDemand: 'High',
    sunlightEn: 'Full sun to partial palm shade.',
    sunlightAr: 'شمس كاملة أو ظل جزئي تحت النخيل.',
    plantingSeasonEn: 'Oct – Nov (sown for multi-year cuts)',
    plantingSeasonAr: 'أكتوبر – نوفمبر (متعدد الحشات)',
    growthDurationDays: 'Perennial (60 days to 1st cut)',
    nutrientNeedsEn: 'Fixes large amounts of Nitrogen; enriches soil before heavy-feeding vegetables.',
    nutrientNeedsAr: 'يثبت كميات كبيرة من النيتروجين قبل الخضروات الشرهة.',
    commonPestIds: ['powdery_mildew'],
    preventionTipsEn: 'After 2–3 years, rotate stand to Sorghum or Tomatoes to utilize built-up nitrogen.',
    preventionTipsAr: 'بعد 2–3 سنوات، دوّر الأرض إلى الذرة أو الطماطم للاستفادة من النيتروجين المتراكم.',
    companionCrops: ['Date Palms', 'Barley'],
    unsuitableFollowers: ['Cowpea', 'Chickpea'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Has favourable suitability (Irrigated)',
  },
  {
    id: 'cabbage',
    nameEn: 'Cabbage',
    nameAr: 'ملفوف / كرنب',
    scientificName: 'Brassica oleracea',
    botanicalFamily: 'Brassicaceae',
    category: 'vegetable',
    rotationGroup: 'Brassica',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Cool Bahrain winter vegetable; thrives Nov–Feb.',
    climateAr: 'خضار شتوي ينجح في البحرين بين نوفمبر وفبراير.',
    tempMinC: 10,
    tempMaxC: 26,
    optimalSoilEn: 'Fertile sandy loam rich in compost, steady moisture.',
    optimalSoilAr: 'تربة خصبة غنية بالكمبوست مع رطوبة منتظمة.',
    waterDemand: 'Moderate to high',
    sunlightEn: 'Full winter sun.',
    sunlightAr: 'شمس شتوية كاملة.',
    plantingSeasonEn: 'Oct – Jan',
    plantingSeasonAr: 'أكتوبر – يناير',
    growthDurationDays: '75–100 days',
    nutrientNeedsEn: 'Needs Nitrogen and Boron/Calcium for tight head formation.',
    nutrientNeedsAr: 'يحتاج نيتروجين وكالسيوم لتكوين رؤوس متماسكة.',
    commonPestIds: ['powdery_mildew', 'whitefly_tylc'],
    preventionTipsEn: 'Excellent Brassica family break between Solanaceae and Cereals.',
    preventionTipsAr: 'عائلة صليبية ممتازة لكسر دورة الآفات بين الباذنجانيات والحبوب.',
    companionCrops: ['Onion', 'Potatoes', 'Cowpea'],
    unsuitableFollowers: ['Cabbage'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Has favourable suitability (Irrigated)',
  },
  {
    id: 'onion',
    nameEn: 'Onion',
    nameAr: 'بصل',
    scientificName: 'Allium cepa',
    botanicalFamily: 'Amaryllidaceae',
    category: 'root',
    rotationGroup: 'Root & bulb',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Winter bulb crop; cures well in dry spring weather.',
    climateAr: 'محصول شتوي تجف أبصاله جيداً في ربيع البحرين الجاف.',
    tempMinC: 10,
    tempMaxC: 30,
    optimalSoilEn: 'Loose, fertile sandy loam; moderate salt tolerance.',
    optimalSoilAr: 'تربة رملية خصبة مفككة متوسطة التحمل للملوحة.',
    waterDemand: 'Moderate',
    sunlightEn: 'Full sun.',
    sunlightAr: 'شمس كاملة.',
    plantingSeasonEn: 'Oct – Dec',
    plantingSeasonAr: 'أكتوبر – ديسمبر',
    growthDurationDays: '110–135 days',
    nutrientNeedsEn: 'Light root feeder; needs Sulfur & Potassium for bulb sizing.',
    nutrientNeedsAr: 'يحتاج كبريت وبوتاسيوم لتكبير البصلة.',
    commonPestIds: ['heat_salinity_stress'],
    preventionTipsEn: 'Helps deter soil pests; great companion/predecessor for Tomatoes and Lettuce.',
    preventionTipsAr: 'يساعد في تقليل آفات التربة؛ سلف وجار ممتاز للطماطم والخس.',
    companionCrops: ['Tomatoes', 'Carrot', 'Lettuce', 'Cabbage'],
    unsuitableFollowers: ['Onion'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Has favourable suitability (Irrigated)',
  },
  {
    id: 'carrot',
    nameEn: 'Carrot',
    nameAr: 'جزر',
    scientificName: 'Daucus carota',
    botanicalFamily: 'Apiaceae',
    category: 'root',
    rotationGroup: 'Root & bulb',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Winter root crop; sweetest roots develop at 15–24°C.',
    climateAr: 'محصول جذري شتوي؛ أفضل جودة وحلاوة بين 15–24°م.',
    tempMinC: 10,
    tempMaxC: 26,
    optimalSoilEn: 'Deep, stone-free sandy soil.',
    optimalSoilAr: 'تربة رملية عميقة خالية من الحجارة.',
    waterDemand: 'Moderate',
    sunlightEn: 'Full winter sun.',
    sunlightAr: 'شمس شتوية كاملة.',
    plantingSeasonEn: 'Oct – Jan',
    plantingSeasonAr: 'أكتوبر – يناير',
    growthDurationDays: '70–90 days',
    nutrientNeedsEn: 'Prefers lower Nitrogen and higher Potassium.',
    nutrientNeedsAr: 'يفضل نيتروجيناً منخفضاً وبوتاسيوم أعلى.',
    commonPestIds: ['root_knot_nematode'],
    preventionTipsEn: 'Always follow cereals (Wheat/Barley) to minimize root nematodes.',
    preventionTipsAr: 'يُفضل زراعته بعد الحبوب (قمح/شعير) لتقليل نيماتودا الجذور.',
    companionCrops: ['Onion', 'Lettuce', 'Tomatoes'],
    unsuitableFollowers: ['Potatoes'],
    bahrainGaEzExtentPct: 53.77,
    bahrainSuitabilityTier: 'Has favourable suitability (Irrigated)',
  },
  {
    id: 'leafy_greens',
    nameEn: 'Leafy Greens & Herbs',
    nameAr: 'ورقيات وأعشاب',
    scientificName: 'Coriandrum / Petroselinum / Spinacia',
    botanicalFamily: 'Mixed',
    category: 'herb',
    rotationGroup: 'Other family',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Fast-turnaround cool-season greens (coriander, parsley, spinach, mint under shade).',
    climateAr: 'ورقيات وأعشاب سريعة الإنتاج (كزبرة، بقدونس، سبانخ، نعناع تحت التظليل).',
    tempMinC: 12,
    tempMaxC: 28,
    optimalSoilEn: 'Rich, friable sandy loam with high compost content.',
    optimalSoilAr: 'تربة رملية غنية بالكمبوست جيدة التهوية.',
    waterDemand: 'Moderate to high',
    sunlightEn: 'Morning sun + afternoon shade cloth in warm months.',
    sunlightAr: 'شمس الصباح مع تظليل خفيف في الأشهر الدافئة.',
    plantingSeasonEn: 'Oct – Mar',
    plantingSeasonAr: 'أكتوبر – مارس',
    growthDurationDays: '30–50 days',
    nutrientNeedsEn: 'Quick nitrogen boost between major seasonal crops.',
    nutrientNeedsAr: 'احتياج سريع للنيتروجين بين المواسم الرئيسية.',
    commonPestIds: ['powdery_mildew', 'heat_salinity_stress'],
    preventionTipsEn: 'Fast cycle fills short windows between winter and summer crops.',
    preventionTipsAr: 'دورتها السريعة تستغل الفترات البينية قبل المواسم الرئيسية.',
    companionCrops: ['Tomatoes', 'Peppers', 'Date Palms'],
    unsuitableFollowers: [],
    bahrainGaEzExtentPct: null,
    bahrainSuitabilityTier: 'High-value local Bahrain market greens',
  },
  {
    id: 'unused',
    nameEn: 'Unused / Preparing',
    nameAr: 'أرض غير مزروعة / قيد التجهيز',
    scientificName: 'Fallow / Soil Solarization',
    botanicalFamily: 'Fallow',
    category: 'forage',
    rotationGroup: 'Other family',
    isLegume: false,
    isPerennial: false,
    climateEn: 'Ideal for summer soil solarization, compost incorporation, or green manure cover.',
    climateAr: 'مثالية للتعقيم الشمسي صيفاً، أو إضافة الكمبوست، أو تجهيز التربة للموسم القادم.',
    tempMinC: 0,
    tempMaxC: 50,
    optimalSoilEn: 'Deep-till, level beds, flush excess salts, and test soil before next planting.',
    optimalSoilAr: 'حرث عميق، تسوية الأحواض، غسل الأملاح، وفحص التربة قبل الزراعة.',
    waterDemand: 'Low',
    sunlightEn: 'Full sun helps natural summer solarization.',
    sunlightAr: 'الشمس القوية تساعد في التعقيم الشمسي الطبيعي صيفاً.',
    plantingSeasonEn: 'Any preparation window',
    plantingSeasonAr: 'أي فترة تجهيز بين المواسم',
    growthDurationDays: '14–45 days',
    nutrientNeedsEn: 'Incorporate composted manure & pre-wet soil before mulching.',
    nutrientNeedsAr: 'إضافة السماد العضوي المتحلل وترطيب التربة قبل الغرس.',
    commonPestIds: [],
    preventionTipsEn: 'Use clear plastic solarization during hot summer months to suppress soil pathogens.',
    preventionTipsAr: 'التعقيم الشمسي بالبلاستيك الشفاف صيفاً يقلل آفات التربة بشكل طبيعي.',
    companionCrops: [],
    unsuitableFollowers: [],
    bahrainGaEzExtentPct: null,
    bahrainSuitabilityTier: 'Fallow / Soil Recovery Phase',
  },
];

export function findCropInLibrary(
  cropName: string,
  allCrops: CropLibraryItem[] = CROP_LIBRARY,
): CropLibraryItem | undefined {
  const lower = cropName.trim().toLowerCase();
  if (!lower) return undefined;
  return allCrops.find(
    (c) =>
      c.id.toLowerCase() === lower ||
      c.nameEn.toLowerCase() === lower ||
      c.nameAr.toLowerCase() === lower ||
      lower.includes(c.nameEn.toLowerCase()) ||
      c.nameEn.toLowerCase().includes(lower) ||
      (lower.includes('tomato') && c.id === 'tomatoes') ||
      (lower.includes('potato') && c.id === 'potatoes') ||
      (lower.includes('palm') && c.id === 'date_palms') ||
      (lower.includes('date') && c.id === 'date_palms') ||
      (lower.includes('unused') && c.id === 'unused') ||
      (lower.includes('prepar') && c.id === 'unused') ||
      (lower.includes('غير مزروع') && c.id === 'unused'),
  );
}

export interface CompatibilityResult {
  score: number; // 0-100 indicative planning score
  rating: 'excellent' | 'good' | 'caution' | 'conflict';
  reasonsEn: string[];
  reasonsAr: string[];
}

export function evaluateCropSequenceCompatibility(
  previousCropName: string,
  nextCropName: string,
  allCrops: CropLibraryItem[] = CROP_LIBRARY,
): CompatibilityResult {
  const prev = findCropInLibrary(previousCropName, allCrops);
  const next = findCropInLibrary(nextCropName, allCrops);

  if (!prev || !next || next.id === 'unused') {
    return {
      score: 75,
      rating: 'good',
      reasonsEn: ['Soil preparation or neutral transition between plantings.'],
      reasonsAr: ['مرحلة تجهيز تربة أو انتقال متوازن بين المحاصيل.'],
    };
  }

  let score = 70;
  const reasonsEn: string[] = [];
  const reasonsAr: string[] = [];

  if (prev.botanicalFamily === next.botanicalFamily && prev.botanicalFamily !== 'Mixed') {
    score -= 35;
    reasonsEn.push(
      `Same botanical family (${next.botanicalFamily}): increases shared pest and soil-disease buildup.`,
    );
    reasonsAr.push(
      `نفس العائلة النباتية (${next.botanicalFamily}): يرفع احتمالية تراكم الآفات وأمراض التربة المشتركة.`,
    );
  } else {
    score += 15;
    reasonsEn.push(
      `Good family break (${prev.botanicalFamily} → ${next.botanicalFamily}).`,
    );
    reasonsAr.push(
      `تبديل عائلة نباتية ممتاز (${prev.botanicalFamily} ← ${next.botanicalFamily}).`,
    );
  }

  if (prev.isLegume && !next.isLegume) {
    score += 12;
    reasonsEn.push(`${prev.nameEn} enriches soil nitrogen for ${next.nameEn}.`);
    reasonsAr.push(`${prev.nameAr} يغني التربة بالنيتروجين لصالح ${next.nameAr}.`);
  } else if (!prev.isLegume && next.isLegume) {
    score += 8;
    reasonsEn.push(`${next.nameEn} helps replenish nitrogen after ${prev.nameEn}.`);
    reasonsAr.push(`${next.nameAr} يساعد في تجديد نيتروجين التربة بعد ${prev.nameAr}.`);
  }

  if (
    prev.unsuitableFollowers.some((u) => u.toLowerCase() === next.nameEn.toLowerCase()) ||
    prev.id === next.id
  ) {
    score = Math.min(score, 32);
    reasonsEn.push(`Avoid planting ${next.nameEn} directly after ${prev.nameEn}.`);
    reasonsAr.push(`يُنصح بتجنب زراعة ${next.nameAr} مباشرة بعد ${prev.nameAr}.`);
  }

  const clamped = Math.max(10, Math.min(98, score));
  const rating: CompatibilityResult['rating'] =
    clamped >= 82 ? 'excellent' : clamped >= 65 ? 'good' : clamped >= 45 ? 'caution' : 'conflict';

  return { score: clamped, rating, reasonsEn, reasonsAr };
}

export interface IndicativeRotationHealth {
  score: number;
  labelEn: string;
  labelAr: string;
  factorsEn: string[];
  factorsAr: string[];
}

export function computeIndicativeRotationScore(
  section: CropSection | null,
  snapshot: FarmEnvironmentSnapshot | null,
  allCrops: CropLibraryItem[] = CROP_LIBRARY,
): IndicativeRotationHealth {
  if (!section) {
    return {
      score: 68,
      labelEn: 'Indicative Baseline (Select a section)',
      labelAr: 'مؤشر إرشادي مبدئي (اختر قسماً)',
      factorsEn: ['Draw or select a crop section on the Map to calculate section-specific rotation diversity.'],
      factorsAr: ['ارسم أو اختر قسماً زراعياً على الخريطة لحساب مؤشر تنوع الدورة الزراعية.'],
    };
  }

  const history = section.cropHistory ?? [];
  const current = findCropInLibrary(section.crop, allCrops);
  const next = section.plannedNextCrop
    ? findCropInLibrary(section.plannedNextCrop, allCrops)
    : undefined;

  let score = 58;
  const factorsEn: string[] = [];
  const factorsAr: string[] = [];

  const families = new Set<string>();
  if (current && current.botanicalFamily !== 'Fallow') families.add(current.botanicalFamily);
  history.forEach((h) => {
    const item = findCropInLibrary(h.crop, allCrops);
    if (item && item.botanicalFamily !== 'Fallow') families.add(item.botanicalFamily);
  });
  if (next && next.botanicalFamily !== 'Fallow') families.add(next.botanicalFamily);

  if (families.size >= 3) {
    score += 20;
    factorsEn.push(`${families.size} distinct botanical families represented in rotation.`);
    factorsAr.push(`تنوع جيد يشمل ${families.size} عائلات نباتية مختلفة في الدورة.`);
  } else if (families.size === 2) {
    score += 10;
    factorsEn.push('2 botanical families planned — adding a 3rd family improves diversity.');
    factorsAr.push('توجد عائلتان نباتيتان — إضافة عائلة ثالثة يعزز التوازن.');
  } else {
    factorsEn.push('Single-family focus so far — consider diversifying with legumes or cereals.');
    factorsAr.push('تركيز على عائلة واحدة حالياً — يُنصح بإدخال البقوليات أو الحبوب.');
  }

  const hasLegume =
    Boolean(current?.isLegume) ||
    Boolean(next?.isLegume) ||
    history.some((h) => findCropInLibrary(h.crop, allCrops)?.isLegume);
  if (hasLegume) {
    score += 12;
    factorsEn.push('Includes a nitrogen-fixing legume crop (Fabaceae).');
    factorsAr.push('يتضمن محصولاً بقولياً مثبتاً للنيتروجين.');
  }

  if (next && current) {
    const compat = evaluateCropSequenceCompatibility(current.nameEn, next.nameEn, allCrops);
    if (compat.rating === 'conflict') {
      score -= 18;
      factorsEn.push(`Planned next crop (${next.nameEn}) conflicts with current (${current.nameEn}).`);
      factorsAr.push(`المحصول المخطط (${next.nameAr}) يتعارض مع المحصول الحالي (${current.nameAr}).`);
    } else if (compat.rating === 'excellent') {
      score += 8;
      factorsEn.push(`Strong planned transition: ${current.nameEn} → ${next.nameEn}.`);
      factorsAr.push(`تسلسل مخطط ممتاز: ${current.nameAr} ← ${next.nameAr}.`);
    }
  }

  if (snapshot?.smap.status === 'optimal' || snapshot?.smap.status === 'moist') {
    score += 4;
    factorsEn.push('Current NASA SMAP moisture supports planned planting readiness.');
    factorsAr.push('رطوبة التربة الحالية من ناسا داعمة لجاهزية التربة.');
  }

  const clamped = Math.max(20, Math.min(96, score));
  return {
    score: clamped,
    labelEn:
      clamped >= 80
        ? 'Strong Planning Diversity'
        : clamped >= 62
          ? 'Moderate Rotation Balance'
          : 'Needs Family Diversification',
    labelAr:
      clamped >= 80
        ? 'تنوع تخطيطي قوي'
        : clamped >= 62
          ? 'توازن دورة متوسط'
          : 'يحتاج تنويع العائلات النباتية',
    factorsEn,
    factorsAr,
  };
}

export interface EnvironmentalRiskWarning {
  id: string;
  severity: 'info' | 'watch' | 'elevated';
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
}

export function evaluateEnvironmentalRisks(
  snapshot: FarmEnvironmentSnapshot | null,
  cropName: string,
  lang: AppLanguage,
): EnvironmentalRiskWarning[] {
  const warnings: EnvironmentalRiskWarning[] = [];
  if (!snapshot) return warnings;

  const temp = snapshot.power.latest?.t2mMax ?? snapshot.power.latest?.t2m ?? null;
  const rh = snapshot.power.latest?.humidityPercent ?? null;
  const rain7 = snapshot.power.sevenDayRainMm ?? 0;
  const vpd = snapshot.power.vpdKpa ?? null;
  const smapStatus = snapshot.smap.status;
  const lowerCrop = cropName.toLowerCase();

  if (temp !== null && temp >= 36) {
    warnings.push({
      id: 'heat-risk',
      severity: 'elevated',
      titleEn: 'High Heat Stress Risk (Indicative)',
      titleAr: 'احتمال إجهاد حراري مرتفع (تحذير إرشادي)',
      detailEn: `NASA POWER regional max/air temperature reached ${temp}°C. Cool-season crops (Lettuce, Potatoes, Tomatoes) face higher risk of blossom drop or wilt; inspect shade nets and morning irrigation.`,
      detailAr: `سجلت بيانات ناسا حرارة ${temp}°م على نطاق الشبكة الإقليمية، مما يرفع احتمال الإجهاد الحراري للمحاصيل المعتدلة.`,
    });
  }

  if (rh !== null && rh >= 64 && temp !== null && temp >= 20 && temp <= 34) {
    warnings.push({
      id: 'fungal-watch',
      severity: 'watch',
      titleEn: 'Favorable Conditions for Powdery Mildew / Blight',
      titleAr: 'ظروف قد تزيد خطر البياض الدقيقي أو اللفحة',
      detailEn: `Regional humidity (${rh}%) combined with warm air (${temp}°C) creates risk-increasing conditions for fungal leaf spots—not a confirmed diagnosis; visually check lower leaves.`,
      detailAr: `الرطوبة النسبية (${rh}%) مع الدفء (${temp}°م) قد تزيد قابلية الأوراق للفطريات؛ هذا تنبيه وقائي وليس تشخيصاً مؤكداً.`,
    });
  }

  if (smapStatus === 'very_dry' || smapStatus === 'dry') {
    warnings.push({
      id: 'moisture-deficit',
      severity: 'watch',
      titleEn: 'Low Regional Surface Soil Moisture',
      titleAr: 'انخفاض رطوبة التربة السطحية إقليمياً',
      detailEn: `NASA SMAP reports "${snapshot.smap.statusLabel}" conditions (~9 km cell). Verify actual field drip moisture before irrigating ${cropName || 'your crop'}.`,
      detailAr: `تشير خلية NASA SMAP (~9 كم) إلى حالة جفاف سطحي؛ يُنصح بفحص رطوبة النقاطات في الحقل قبل جدولة الري.`,
    });
  }

  if ((lowerCrop.includes('lettuce') || lowerCrop.includes('potato')) && temp !== null && temp > 30) {
    warnings.push({
      id: 'crop-heat-mismatch',
      severity: 'elevated',
      titleEn: 'Warm Window Caution for Cool-Season Crop',
      titleAr: 'تنبيه حرارة لمحصول موسم معتدل',
      detailEn: `${cropName} prefers cooler temperatures than ${temp}°C; watch closely for bolting, bitter leaves, or tuber stress.`,
      detailAr: `يفضل محصول ${cropName} درجات حرارة أقل من ${temp}°م؛ راقب علامات الإجهاد في الحقل.`,
    });
  }

  if (vpd !== null && vpd >= 2.2) {
    warnings.push({
      id: 'vpd-evap',
      severity: 'info',
      titleEn: 'High Atmospheric Evaporative Demand (VPD)',
      titleAr: 'ارتفاع معدل التبخر والنتح (VPD)',
      detailEn: `Vapor pressure deficit is ${vpd.toFixed(2)} kPa with ${rain7} mm 7-day rain. Morning/dusk irrigation helps reduce evaporation loss.`,
      detailAr: `عجز ضغط البخار ${vpd.toFixed(2)} كيلوباسكال؛ يُفضل الري في الصباح الباكر أو المساء لتقليل الفاقد بالتبخر.`,
    });
  }

  if (warnings.length === 0) {
    warnings.push({
      id: 'stable-env',
      severity: 'info',
      titleEn: lang === 'en' ? 'No Elevated Environmental Risk Flags' : 'لا توجد مؤشرات خطر بيئية مرتفعة',
      titleAr: 'لا توجد مؤشرات خطر بيئية مرتفعة حالياً',
      detailEn: 'Current NASA SMAP & POWER indicators show balanced conditions. Continue routine visual field scouting.',
      detailAr: 'تشير قراءات ناسا الحالية إلى استقرار نسبي؛ استمر في الفحص البصري الدوري للحقل.',
    });
  }

  return warnings;
}

export interface FruitPresetOption {
  id: string;
  nameEn: string;
  nameAr: string;
  bahrainRelevance: string;
}

export const SUPPORTED_RIPE_FRUITS: FruitPresetOption[] = [
  { id: 'dates', nameEn: 'Dates (Khalal / Rutab / Tamar)', nameAr: 'تمر / رطب / خلال', bahrainRelevance: 'Primary Bahrain orchard crop' },
  { id: 'tomatoes', nameEn: 'Tomatoes', nameAr: 'طماطم', bahrainRelevance: 'Major Bahrain field & greenhouse crop' },
  { id: 'peppers', nameEn: 'Bell & Chili Peppers', nameAr: 'فلفل حلو وحار', bahrainRelevance: 'Common protected & open-bed fruit' },
  { id: 'cucumbers', nameEn: 'Cucumbers', nameAr: 'خيار', bahrainRelevance: 'Common Bahrain greenhouse vine crop' },
  { id: 'strawberries', nameEn: 'Strawberries', nameAr: 'فراولة', bahrainRelevance: 'Winter hydroponic & sandy bed crop' },
  { id: 'figs', nameEn: 'Figs', nameAr: 'تين', bahrainRelevance: 'Heat-tolerant Gulf orchard fruit' },
  { id: 'citrus', nameEn: 'Citrus (Lemon / Lime / Orange)', nameAr: 'حمضيات (ليمون / برتقال)', bahrainRelevance: 'Bahrain orchard tree crop' },
  { id: 'watermelon', nameEn: 'Watermelon / Melon', nameAr: 'بطيخ / شمام', bahrainRelevance: 'Warm spring Bahrain melon crop' },
  { id: 'grapes', nameEn: 'Grapes', nameAr: 'عنب', bahrainRelevance: 'Arid trellis fruit crop' },
  { id: 'mango', nameEn: 'Mango / Papaya / Pomegranate', nameAr: 'مانجو / رمان / بابايا', bahrainRelevance: 'Orchard specialty fruits' },
];

export function generateCropCareSchedule(params: {
  crop: string;
  growingStage?: string;
  plotId?: string;
  sectionId?: string;
  sectionName?: string;
  snapshot?: FarmEnvironmentSnapshot | null;
  allCrops?: CropLibraryItem[];
  language?: AppLanguage;
}): Array<{
  type: 'npk' | 'foliar' | 'humidity' | 'monthly_plan';
  titleEn: string;
  titleAr: string;
  detailsEn: string;
  detailsAr: string;
  npkFormula?: string;
  offsetDays: number;
}> {
  const cropItem = findCropInLibrary(params.crop, params.allCrops ?? CROP_LIBRARY);
  const stage = params.growingStage || 'vegetative';
  const isLegume = cropItem?.isLegume ?? false;
  const isPerennial = cropItem?.isPerennial ?? false;
  const lowerCrop = params.crop.toLowerCase();
  const rh = params.snapshot?.power.latest?.humidityPercent ?? null;
  const vpd = params.snapshot?.power.vpdKpa ?? null;

  const items: Array<{
    type: 'npk' | 'foliar' | 'humidity' | 'monthly_plan';
    titleEn: string;
    titleAr: string;
    detailsEn: string;
    detailsAr: string;
    npkFormula?: string;
    offsetDays: number;
  }> = [];

  // A. Crop- & Stage-Specific NPK Fertilisation
  if (isLegume) {
    items.push({
      type: 'npk',
      titleEn: `Low-Nitrogen Legume NPK (${params.crop})`,
      titleAr: `تسميد بقولي منخفض النيتروجين (${cropItem?.nameAr || params.crop})`,
      detailsEn:
        'Legumes fix atmospheric nitrogen via root nodules. Prioritize Phosphorus & Potassium (e.g., low-N 5-15-15 or 10-20-20) rather than high-nitrogen feeds that suppress nodulation.',
      detailsAr:
        'البقوليات تثبت النيتروجين طبيعياً. ركز على الفوسفور والبوتاسيوم وتجنب الجرعات العالية من النيتروجين.',
      npkFormula: 'Low-N / P-K Focus (follow product label)',
      offsetDays: 3,
    });
  } else if (stage === 'flowering' || stage === 'fruiting') {
    items.push({
      type: 'npk',
      titleEn: `Fruit & Bloom Potassium-Rich NPK (${params.crop})`,
      titleAr: `تسميد الإزهار والإثمار عالي البوتاسيوم (${cropItem?.nameAr || params.crop})`,
      detailsEn: `Stage "${stage}" shifts demand toward Potassium and Calcium for fruit fill and blossom retention. Apply label-guided high-K soluble blend via drip fertigation.`,
      detailsAr:
        'في مرحلة الإزهار والإثمار يزداد احتياج البوتاسيوم والكالسيوم لجودة الثمار؛ استخدم دفعة عالية البوتاسيوم وفق ملصق العبوة.',
      npkFormula: 'High-K / Ca support (per label)',
      offsetDays: 2,
    });
  } else if (isPerennial || lowerCrop.includes('palm')) {
    items.push({
      type: 'npk',
      titleEn: `Orchard Seasonal Root Feed (${params.crop})`,
      titleAr: `تسميد الأشجار والمحاصيل المعمرة (${cropItem?.nameAr || params.crop})`,
      detailsEn:
        'Incorporate well-composted organic matter and balanced slow-release orchard NPK + magnesium/boron according to palm frond growth stage and soil salinity.',
      detailsAr:
        'ادمج السماد العضوي المتحلل مع NPK متوازن والعناصر الصغرى وفق عمر النخلة وحالة الملوحة.',
      npkFormula: 'Balanced Orchard + Mg/B (per label)',
      offsetDays: 5,
    });
  } else {
    items.push({
      type: 'npk',
      titleEn: `Vegetative Balanced NPK (${params.crop})`,
      titleAr: `تسميد النمو الخضري المتوازن (${cropItem?.nameAr || params.crop})`,
      detailsEn: `${cropItem?.nutrientNeedsEn || 'Balanced root and canopy support.'} Apply split-dose balanced NPK in drip irrigation strictly per label rate.`,
      detailsAr: `${cropItem?.nutrientNeedsAr || 'تغذية متوازنة للمجموع الجذري والخضري.'} يُضاف على دفعات بالتنقيط وفق النشرة المعتمدة.`,
      npkFormula: 'Balanced NPK + Micros (per label)',
      offsetDays: 4,
    });
  }

  // B. Foliar Spraying tailored to crop
  items.push({
    type: 'foliar',
    titleEn: `Morning Micronutrient Foliar Check (${params.crop})`,
    titleAr: `رش ورقي صباحي بالعناصر الصغرى (${cropItem?.nameAr || params.crop})`,
    detailsEn:
      'In calcareous/alkaline Bahraini sandy soils, chelated Iron (Fe-EDDHA), Zinc, or Calcium foliar misting at dawn (never midday sun) prevents leaf burn and micronutrient lockup.',
    detailsAr:
      'في التربة الرملية القلوية، يُفضل الرش الورقي للحديد المخلبي أو الزنك فجراً (وليس في الشمس الحارة) لتجنب حرق الأوراق.',
    offsetDays: 7,
  });

  // C. Humidity Management informed by live NASA RH / VPD
  const humidityAdviceEn =
    rh !== null && rh >= 65
      ? `NASA POWER RH is elevated (${Math.round(rh)}%). Prioritize morning airflow, prune dense lower leaves, and avoid evening overhead misting to lower mildew risk.`
      : vpd !== null && vpd >= 2.2
        ? `High evaporative demand (VPD ${vpd.toFixed(2)} kPa). Check 30–40% shade netting and consider light morning misting/mulching for tender foliage.`
        : 'Monitor greenhouse vents or open-field shade nets; water early morning so foliage dries cleanly before dusk.';
  const humidityAdviceAr =
    rh !== null && rh >= 65
      ? `الرطوبة النسبية في ناسا مرتفعة (${Math.round(rh)}%). اهتم بالتهوية الصباحية وتجنب الرش المسائي لتقليل خطر الفطريات.`
      : vpd !== null && vpd >= 2.2
        ? `معدل التبخر مرتفع (VPD ${vpd.toFixed(2)} kPa). راجع شباك التظليل والتغطية العضوية للحفاظ على رطوبة منطقة الجذور.`
        : 'راقب التهوية وشباك التظليل ونفذ الري صباحاً لجفاف الأوراق قبل المساء.';

  items.push({
    type: 'humidity',
    titleEn: `Humidity & Microclimate Check (${params.crop})`,
    titleAr: `إدارة الرطوبة والتهوية (${cropItem?.nameAr || params.crop})`,
    detailsEn: humidityAdviceEn,
    detailsAr: humidityAdviceAr,
    offsetDays: 1,
  });

  // D. Monthly Fertilisation Plan anchor
  items.push({
    type: 'monthly_plan',
    titleEn: `Monthly Soil & Fertilisation Review (${params.crop})`,
    titleAr: `المراجعة الشهرية للتربة والتسميد (${cropItem?.nameAr || params.crop})`,
    detailsEn: `Inspect root-zone salt accumulation, flush drip lines if needed, review ${cropItem?.botanicalFamily || 'crop'} stage transition, and plan next month’s nutrient split.`,
    detailsAr: `فحص ملوحة منطقة الجذور، غسيل خطوط التنقيط عند الحاجة، ومراجعة احتياجات المرحلة القادمة للمحصول.`,
    offsetDays: 21,
  });

  return items;
}
