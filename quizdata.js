/* Preloaded quizzes: 12 topics x 12 questions. Format: Q("question","opt1|opt2|opt3|opt4",correctIndex) */
const Q=(q,o,a)=>({q,o:o.split("|"),a,type:"mcq"});
const QUIZZES=[
{id:"algebra",emoji:"➕",title:"Algebra Basics",ta:"இயற்கணிதம்",subject:"Maths",cls:"9-10",qs:[
Q("Solve: 2x + 6 = 14","2|4|6|8",1),Q("Expand (a + b)²","a²+b²|a²+2ab+b²|a²−2ab+b²|2a+2b",1),Q("Factorise x² − 9","(x−3)(x+3)|(x−9)(x+1)|(x−3)²|(x+3)²",0),
Q("Degree of 5x³ + 2x − 7","1|2|3|7",2),Q("If x+y=10 and x−y=2, then x =","4|5|6|8",2),Q("Roots of x² − 5x + 6 = 0","2, 3|1, 6|−2, −3|5, 6",0),
Q("3² × 3³ =","3⁶|3⁵|9⁵|6⁵",1),Q("Simplify 4(x+2) − 2x","2x+8|6x+8|2x+2|4x+6",0),Q("Slope of y = 3x + 5","5|3|1/3|8",1),
Q("Solutions of |x| = 7","7 only|−7 only|7 or −7|0",2),Q("Discriminant of x² + 4x + 4","0|4|8|16",0),Q("(−2)³ =","−6|6|−8|8",2)]},
{id:"geometry",emoji:"📐",title:"Geometry & Triangles",ta:"வடிவியல்",subject:"Maths",cls:"9-10",qs:[
Q("Sum of angles of a triangle","90°|180°|270°|360°",1),Q("Hypotenuse of a right triangle with legs 3 and 4","5|6|7|25",0),Q("Area of a circle of radius r","2πr|πr²|πr|2πr²",1),
Q("Each angle of an equilateral triangle","45°|60°|90°|120°",1),Q("Sum of interior angles of a quadrilateral","180°|270°|360°|540°",2),Q("Angle in a semicircle","60°|90°|120°|180°",1),
Q("Area of a triangle, base 10 and height 6","16|30|60|32",1),Q("Which is a Pythagorean triple?","5, 12, 13|4, 5, 7|6, 7, 8|2, 3, 4",0),Q("Number of sides of a hexagon","5|6|7|8",1),
Q("Opposite angles of a parallelogram are","supplementary|equal|complementary|zero",1),Q("Volume of a cube of side 3","9|18|27|81",2),Q("Diagonals of a rectangle are","unequal|equal|only perpendicular|parallel",1)]},
{id:"trig",emoji:"📈",title:"Trigonometry",ta:"முக்கோணவியல்",subject:"Maths",cls:"10-11",qs:[
Q("sin 30° =","1/2|√3/2|1|0",0),Q("cos 60° =","√3/2|1/2|0|1",1),Q("tan 45° =","0|1|√3|∞",1),Q("sin²θ + cos²θ =","0|1|2|tan θ",1),Q("cos 0° =","0|1/2|1|−1",2),
Q("tan θ =","cos θ / sin θ|sin θ / cos θ|1 / sin θ|sin θ · cos θ",1),Q("sec θ =","1/sin θ|1/cos θ|1/tan θ|cos θ/sin θ",1),Q("sin 90° =","0|1|1/2|√3/2",1),
Q("In a right triangle sin θ =","adjacent/hypotenuse|opposite/hypotenuse|opposite/adjacent|hypotenuse/opposite",1),Q("cot θ =","tan θ|1/tan θ|sin θ|1/sin θ",1),
Q("If sin θ = 3/5 (acute), cos θ =","4/5|3/4|5/3|2/5",0),Q("tan 0° =","0|1|∞|−1",0)]},
{id:"motion",emoji:"🚀",title:"Motion & Force",ta:"இயக்கமும் விசையும்",subject:"Physics",cls:"9-11",qs:[
Q("SI unit of force","Joule|Newton|Watt|Pascal",1),Q("Newton's first law is the law of","inertia|acceleration|action-reaction|gravity",0),Q("Speed =","time/distance|distance/time|distance×time|mass×velocity",1),
Q("Force F =","m/a|m × a|m + a|a/m",1),Q("Acceleration due to gravity on Earth ≈","9.8 m/s²|98 m/s²|0.98 m/s²|1 m/s²",0),Q("A car covers 120 km in 2 h. Its speed is","40 km/h|60 km/h|120 km/h|240 km/h",1),
Q("Unit of momentum","kg·m/s|N/s|kg/s|J",0),Q("Which is a vector quantity?","Speed|Distance|Velocity|Mass",2),Q("Action and reaction forces are","equal and opposite|equal, same direction|unequal|zero",0),
Q("Work done =","F × d|F / d|m × a|F + d",0),Q("Friction acts","along the motion|opposite to the motion|perpendicular|in no direction",1),Q("Momentum =","m + v|m × v|m / v|v / m",1)]},
{id:"electric",emoji:"⚡",title:"Electricity & Magnetism",ta:"மின்சாரமும் காந்தமும்",subject:"Physics",cls:"10-12",qs:[
Q("Unit of resistance","Ampere|Volt|Ohm|Watt",2),Q("Ohm's law","V = IR|V = I/R|I = VR|R = VI",0),Q("Current is measured by","Voltmeter|Ammeter|Barometer|Thermometer",1),
Q("Good conductor","Rubber|Copper|Glass|Wood",1),Q("In a series circuit the same ___ flows","voltage|current|resistance|power",1),Q("Unit of electric power","Watt|Volt|Ampere|Coulomb",0),
Q("Like poles of magnets","attract|repel|do nothing|merge",1),Q("A fuse wire has","high melting point|low melting point|zero resistance|no current",1),Q("Magnetic effect of current was found by","Newton|Oersted|Faraday|Edison",1),
Q("Power P =","V × I|V / I|I / V|V + I",0),Q("2 Ω and 3 Ω in series give","1 Ω|5 Ω|6 Ω|1.2 Ω",1),Q("Converts mechanical to electrical energy","Motor|Generator|Transformer|Battery",1)]},
{id:"atoms",emoji:"⚛️",title:"Atoms & Periodic Table",ta:"அணுக்கள்",subject:"Chemistry",cls:"9-11",qs:[
Q("Atomic number equals number of","neutrons|protons|nucleons|molecules",1),Q("Charge of an electron","positive|negative|neutral|double",1),Q("Symbol of sodium","S|So|Na|N",2),Q("A noble gas","Oxygen|Neon|Chlorine|Nitrogen",1),
Q("Mass number =","protons + neutrons|protons + electrons|electrons only|neutrons only",0),Q("Element with atomic number 6","Nitrogen|Carbon|Oxygen|Boron",1),Q("Modern periodic table is arranged by","atomic mass only|atomic number|density|colour",1),
Q("Valence electrons of chlorine","1|5|7|8",2),Q("Nuclear model of atom was proposed by","Thomson|Rutherford|Dalton|Bohr",1),Q("Group 1 elements are called","halogens|alkali metals|noble gases|metalloids",1),
Q("Symbol of iron","Ir|Fe|I|Fi",1),Q("Isotopes have the same","mass number|number of neutrons|atomic number|nothing",2)]},
{id:"acids",emoji:"🧪",title:"Acids, Bases & Salts",ta:"அமிலம், காரம், உப்பு",subject:"Chemistry",cls:"10",qs:[
Q("pH of pure water","0|7|10|14",1),Q("Acid turns blue litmus","red|green|yellow|colourless",0),Q("Formula of hydrochloric acid","H₂SO₄|HCl|HNO₃|NaOH",1),Q("Baking soda is","NaHCO₃|Na₂CO₃|NaCl|CaCO₃",0),
Q("A base turns red litmus","blue|red|yellow|green",0),Q("Acid + base gives","salt + water|salt only|gas|metal",0),Q("Vinegar contains","citric acid|acetic acid|lactic acid|tartaric acid",1),
Q("pH of a strong acid is about","13|7|1|9",2),Q("Antacids treat","acidity|fever|cold|pain",0),Q("Common salt","NaCl|KCl|CaCl₂|NaOH",0),Q("Lemon juice is","basic|acidic|neutral|salty",1),Q("Phenolphthalein in a base turns","colourless|pink|blue|yellow",1)]},
{id:"plants",emoji:"🌿",title:"Photosynthesis & Plants",ta:"ஒளிச்சேர்க்கை",subject:"Biology",cls:"9-10",qs:[
Q("Gas absorbed in photosynthesis","O₂|CO₂|N₂|H₂",1),Q("Green pigment of leaves","Chlorophyll|Haemoglobin|Melanin|Keratin",0),Q("Site of photosynthesis","Mitochondria|Chloroplast|Nucleus|Ribosome",1),
Q("Gas released","CO₂|O₂|N₂|CH₄",1),Q("Food made by plants","Glucose|Protein|Fat|Vitamin",0),Q("Tiny pores on leaves","Stomata|Xylem|Roots|Pistil",0),Q("Water is carried by","Phloem|Xylem|Stomata|Cambium",1),
Q("Energy source for photosynthesis","Sunlight|Moonlight|Wind|Soil",0),Q("Loss of water vapour from leaves","Transpiration|Respiration|Germination|Fertilisation",0),Q("Male part of a flower","Stamen|Pistil|Sepal|Ovary",0),
Q("Roots absorb","water & minerals|sunlight|only oxygen|CO₂",0),Q("Organisms making their own food","Heterotrophs|Autotrophs|Parasites|Decomposers",1)]},
{id:"body",emoji:"🫀",title:"Human Body Systems",ta:"மனித உடல்",subject:"Biology",cls:"9-12",qs:[
Q("Organ that pumps blood","Lungs|Heart|Liver|Kidney",1),Q("Largest organ of the body","Skin|Liver|Heart|Brain",0),Q("Gas exchange takes place in","Alveoli|Neurons|Villi|Nephrons",0),Q("Haemoglobin is found in","RBC|WBC|Platelets|Plasma",0),
Q("Digestion begins in the","Stomach|Mouth|Intestine|Liver",1),Q("Blood is filtered by the","Kidney|Heart|Lung|Stomach",0),Q("Bones in an adult human","206|300|106|250",0),Q("Control centre of the body","Brain|Heart|Liver|Skin",0),
Q("Vitamin D is made with help of","sunlight|water|salt|air",0),Q("Vessels carrying blood away from heart","Veins|Arteries|Capillaries|Nerves",1),Q("Enzyme in saliva","Amylase|Pepsin|Lipase|Trypsin",0),Q("White blood cells","carry oxygen|fight infection|clot blood|digest food",1)]},
{id:"freedom",emoji:"🇮🇳",title:"India's Freedom Struggle",ta:"இந்திய விடுதலைப் போராட்டம்",subject:"History",cls:"9-12",qs:[
Q("Jallianwala Bagh massacre year","1857|1919|1930|1942",1),Q("Leader of the Dandi March","Nehru|Gandhi|Bose|Patel",1),Q("Quit India Movement year","1930|1942|1947|1920",1),Q("India became independent in","1945|1947|1950|1952",1),
Q("Who said 'Give me blood, I will give you freedom'?","Subhas Chandra Bose|Tilak|Gokhale|Bhagat Singh",0),Q("V.O. Chidambaram Pillai started","Swadeshi Steam Navigation Company|Indian National Congress|Home Rule League|Servants of India",0),
Q("Indian National Congress founded in","1857|1885|1905|1919",1),Q("Partition of Bengal year","1905|1911|1919|1930",0),Q("The Revolt known as the First War of Independence","1757|1857|1919|1942",1),
Q("Tamil poet of patriotic songs","Bharathiyar|Kambar|Valluvar|Ilango",0),Q("Salt Satyagraha year","1920|1930|1942|1947",1),Q("First Prime Minister of India","Patel|Nehru|Gandhi|Rajendra Prasad",1)]},
{id:"climate",emoji:"🌍",title:"Earth, Climate & Maps",ta:"புவியியல்",subject:"Geography",cls:"9-12",qs:[
Q("Largest continent","Africa|Asia|Europe|Australia",1),Q("Earth rotates once in","24 hours|365 days|12 hours|30 days",0),Q("Line at 0° latitude","Equator|Prime Meridian|Tropic of Cancer|Arctic Circle",0),
Q("Lowest layer of the atmosphere","Troposphere|Stratosphere|Mesosphere|Exosphere",0),Q("Tamil Nadu gets most rain from the","North-East monsoon|Western disturbance|Trade winds|Jet stream",0),
Q("Largest peninsular river of India","Kaveri|Godavari|Krishna|Vaigai",1),Q("Earth goes around the Sun in","24 hours|30 days|365¼ days|7 days",2),Q("Most abundant gas in air","Oxygen|Nitrogen|CO₂|Argon",1),
Q("Highest mountain peak","K2|Mount Everest|Kanchenjunga|Nanda Devi",1),Q("A greenhouse gas","CO₂|N₂|Argon|Helium",0),Q("Deccan Plateau lies in","North India|Peninsular India|Himalayas|Thar Desert",1),Q("Largest ocean","Atlantic|Indian|Pacific|Arctic",2)]},
{id:"python",emoji:"🐍",title:"Python Programming Basics",ta:"பைதான் அடிப்படை",subject:"Computer Science",cls:"11-12",qs:[
Q("Which function prints output?","echo()|print()|printf()|write()",1),Q("Python file extension",".py|.pt|.python|.pyt",0),Q("Data type of 3.14","int|float|str|bool",1),Q("len('abc') returns","2|3|4|error",1),
Q("Comment symbol","//|#|/* */|--",1),Q("2 ** 3 =","6|8|9|5",1),Q("Keyword to define a function","func|def|function|fun",1),Q("A list literal","[1, 2]|(1, 2)|{1, 2}|<1, 2>",0),
Q("range(3) gives","1,2,3|0,1,2|0,1,2,3|1,2",1),Q("Which is a loop?","for|loop|repeat|iterate",0),Q("Converts '5' to a number","str('5')|int('5')|list('5')|dict('5')",1),Q("10 % 3 =","0|1|3|3.33",1)]}
];
