/**
 * Urdu / English UI strings.
 *
 * The toggle translates the main app chrome (navigation, headings, buttons,
 * labels). Longer content — recipe text, error messages, the Privacy Policy
 * and Terms — stays in English for now; a full translation of those is a
 * separate pass. The layout stays left-to-right in both languages (full
 * right-to-left layout is a follow-up); only the `lang` attribute changes.
 * Both dictionaries must carry exactly the same keys — enforced by test.
 */

export type Language = 'en' | 'ur';

export interface UiStrings {
  recipes: string;
  shoppingList: string;
  mealPlan: string;
  scanFridge: string;
  scan: string;
  suggestedRecipes: string;
  favourites: string;
  favouritesOnly: string;
  searchPlaceholder: string;
  startCooking: string;
  ingredients: string;
  ingredientsChecklist: string;
  inFridge: string;
  addToList: string;
  inList: string;
  servings: string;
  serving: string;
  caloriesPerServing: string;
  totalCalories: string;
  nutrition: string;
  macrosNotProvided: string;
  contains: string;
  noAllergensDetected: string;
  allergenNote: string;
  notScalableNote: string;
  print: string;
  backToRecipes: string;
  cookingMode: string;
  step: string;
  nextStep: string;
  previousStep: string;
  finishRecipe: string;
  doneCooking: string;
  readAloud: string;
  stopReading: string;
  autoReadNext: string;
  voiceSpeed: string;
  voice: string;
  systemDefault: string;
  readStepPrefix: string;
  readStepShort: string;
  noUrduVoice: string;
  allSteps: string;
  chefTip: string;
  dishComplete: string;
  itemsToPickUp: string;
  copyList: string;
  copied: string;
  clearChecked: string;
  addItem: string;
  quantity: string;
  category: string;
  yourFridge: string;
  inYourFridge: string;
  dietaryFilters: string;
  reset: string;
  recentScans: string;
  addIngredient: string;
  refreshWithAI: string;
  generatingRecipes: string;
  uploadPhoto: string;
  useCamera: string;
  rescanPhoto: string;
  clearScan: string;
  captureAnalyze: string;
  cancel: string;
  sampleFridge: string;
  privacyPolicy: string;
  terms: string;
  mealPlannerTitle: string;
  mealPlannerIntro: string;
  noMealPlanned: string;
  chooseRecipe: string;
  addPlanToShoppingList: string;
  clearPlan: string;
  plannedMeals: string;
  weekCalories: string;
  shareTitle: string;
  shareIntro: string;
  shareLocalNote: string;
  copyLink: string;
  copyCode: string;
  importCode: string;
  pasteCodePlaceholder: string;
  import: string;
  linkCopied: string;
  codeCopied: string;
  showAllRecipes: string;
  noFavouriteRecipes: string;
  noRecipesMatch: string;
  language: string;
  fridges: string;
  newFridge: string;
  fridgeNamePlaceholder: string;
  deleteFridge: string;
  renameFridge: string;
  totalTime: string;
  anyTime: string;
  under15Min: string;
  under30Min: string;
  under45Min: string;
  difficulty: string;
  all: string;
  easy: string;
  medium: string;
  hard: string;
  useBy: string;
  save: string;
  items: string;
  noIngredientsYet: string;
  quantityOptional: string;
  clear: string;
  soon: string;
  scannerTitle: string;
  scannerKicker: string;
  stagePreparing: string;
  stageUploading: string;
  stageAnalyzing: string;
  stageGenerating: string;
  stagePolling: string;
  fridgePreviewReady: string;
  analyzingFridge: string;
  scanTakesAboutAMinute: string;
  pollCheckLine: string;
  addItemLabel: string;
  quantityPlaceholder: string;
  itemPlaceholder: string;
  listEmpty: string;
  listEmptyHint: string;
  browseRecipes: string;
  forRecipe: string;
  showingLine: string;
  undoRefresh: string;
  resetFilters: string;
  generateRecipes: string;
  hideFilters: string;
  showFilters: string;
  // Auth (Supabase login + account sync)
  signIn: string;
  signUp: string;
  signOut: string;
  signInWithGoogle: string;
  signInWithEmail: string;
  createAccount: string;
  emailAddress: string;
  password: string;
  authTitle: string;
  authIntro: string;
  authSignedInAs: string;
  authGuestNote: string;
  authUploadPrompt: string;
  authUpload: string;
  authKeepLocal: string;
  authSyncing: string;
  authSynced: string;
  authSyncError: string;
  authNotConfigured: string;
  authInvalidCredentials: string;
  authEmailExists: string;
  authPasswordTooShort: string;
  authInvalidEmail: string;
  authEmailNotConfirmed: string;
  authErrorGeneric: string;
  authConfirmEmail: string;
  authOrDivider: string;
  authHaveAccount: string;
  authNeedAccount: string;
  // Admin panel (users list + Pro toggle) — admin account only
  adminTitle: string;
  adminIntro: string;
  adminNoUsers: string;
  adminLoading: string;
  adminLoadError: string;
  adminToggleError: string;
  adminPro: string;
  adminFree: string;
  adminMakePro: string;
  adminRemovePro: string;
}

const EN: UiStrings = {
  recipes: 'Recipes',
  shoppingList: 'Shopping List',
  mealPlan: 'Meal Plan',
  scanFridge: 'Scan Fridge',
  scan: 'Scan',
  suggestedRecipes: 'Suggested Recipes',
  favourites: 'Favourites',
  favouritesOnly: 'favourites only',
  searchPlaceholder: 'Search dishes or ingredients...',
  startCooking: 'Start Cooking',
  ingredients: 'Ingredients',
  ingredientsChecklist: 'Ingredients Checklist',
  inFridge: 'In fridge',
  addToList: 'Add to list',
  inList: 'In list',
  servings: 'servings',
  serving: 'serving',
  caloriesPerServing: 'kcal per serving',
  totalCalories: 'total calories',
  nutrition: 'Nutrition',
  macrosNotProvided: 'Protein, carbs and fat are not listed for this recipe.',
  contains: 'Contains',
  noAllergensDetected: 'No common allergens detected in the listed ingredients',
  allergenNote: 'Based only on ingredient names — always check product labels.',
  notScalableNote:
    'Some amounts have no quantity in the recipe, so they are shown as written.',
  print: 'Print',
  backToRecipes: 'Back to Recipes',
  cookingMode: 'Hands-Free Cooking Mode',
  step: 'Step',
  nextStep: 'Next Step',
  previousStep: 'Previous Step',
  finishRecipe: 'Finish Recipe',
  doneCooking: 'Done Cooking',
  readAloud: 'Read Step Aloud',
  stopReading: 'Stop Reading',
  autoReadNext: 'Auto-read next step',
  voiceSpeed: 'Voice speed',
  voice: 'Voice',
  systemDefault: 'System default',
  readStepPrefix: 'Step {n} of {total}.',
  readStepShort: 'Step {n}.',
  noUrduVoice:
    'No Urdu voice is installed on this device — read-aloud will use the system default voice.',
  allSteps: 'All Steps',
  chefTip: 'Chef tip',
  dishComplete: 'Dish complete — enjoy your meal!',
  itemsToPickUp: 'items to pick up',
  copyList: 'Copy List',
  copied: 'Copied',
  clearChecked: 'Clear Checked',
  addItem: 'Add Item',
  quantity: 'Quantity',
  category: 'Category',
  yourFridge: 'Your Fridge',
  inYourFridge: 'In Your Fridge',
  dietaryFilters: 'Dietary Filters',
  reset: 'Reset',
  recentScans: 'Recent Scans',
  addIngredient: 'Add ingredient...',
  refreshWithAI: 'Refresh Recipes with AI',
  generatingRecipes: 'Generating Recipes...',
  uploadPhoto: 'Upload Fridge Photo',
  useCamera: 'Use Camera',
  rescanPhoto: 'Re-scan Current Photo',
  clearScan: 'Clear scan & restore sample',
  captureAnalyze: 'Capture & Analyze',
  cancel: 'Cancel',
  sampleFridge: 'Sample fridge — not your scan',
  privacyPolicy: 'Privacy Policy',
  terms: 'Terms',
  mealPlannerTitle: 'Weekly Meal Plan',
  mealPlannerIntro:
    'Pick one recipe per day. Missing essentials can go straight to your shopping list.',
  noMealPlanned: 'No meal planned',
  chooseRecipe: 'Choose a recipe...',
  addPlanToShoppingList: 'Add missing ingredients to shopping list',
  clearPlan: 'Clear plan',
  plannedMeals: 'meals planned',
  weekCalories: 'kcal for the week',
  shareTitle: 'Share fridge & lists',
  shareIntro:
    'Send a copy of this fridge, your shopping list and your meal plan to family. They import it into their own Fridjo.',
  shareLocalNote:
    'Local-only sharing: the link contains a copy of your data. Anyone with the link can import it. No live sync — changes after sharing are not shared.',
  copyLink: 'Copy share link',
  copyCode: 'Copy share code',
  importCode: 'Import a share code',
  pasteCodePlaceholder: 'Paste a share code you received...',
  import: 'Import',
  linkCopied: 'Link copied',
  codeCopied: 'Code copied',
  showAllRecipes: 'Show All Recipes',
  noFavouriteRecipes: 'No favourite recipes yet',
  noRecipesMatch: 'No recipes match those filters',
  language: 'Language',
  fridges: 'Fridges',
  newFridge: 'New fridge',
  fridgeNamePlaceholder: 'Fridge name, e.g. Garage Fridge',
  deleteFridge: 'Delete this fridge',
  renameFridge: 'Rename this fridge',
  totalTime: 'Total Time',
  anyTime: 'Any time',
  under15Min: 'Under 15 min',
  under30Min: 'Under 30 min',
  under45Min: 'Under 45 min',
  difficulty: 'Difficulty',
  all: 'All',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  useBy: 'Use by',
  save: 'Save',
  items: 'items',
  noIngredientsYet:
    'No ingredients listed yet. Snap a fridge photo or add ingredients above.',
  quantityOptional: 'Quantity (optional, e.g. 200 g)',
  clear: 'Clear',
  soon: 'soon',
  scannerTitle: 'Snap your open fridge, cook what you have',
  scannerKicker: 'Visual Ingredient Recognition',
  stagePreparing: 'Preparing your photo…',
  stageUploading: 'Uploading photo…',
  stageAnalyzing: 'Detecting ingredients…',
  stageGenerating: 'Generating recipes…',
  stagePolling: 'AI is still working — checking for results…',
  fridgePreviewReady: 'Fridge preview ready',
  analyzingFridge: 'Analyzing Fridge...',
  scanTakesAboutAMinute:
    'AI analysis usually takes about a minute. Please keep this tab open.',
  pollCheckLine:
    'Check {attempt} of {max} — still waiting for the AI. A refresh can take a few minutes; please keep this tab open.',
  addItemLabel: 'Ingredient or grocery item',
  quantityPlaceholder: 'e.g., 200 g',
  itemPlaceholder: 'e.g., Feta Cheese, Fresh Dill, Tahini',
  listEmpty: 'Your shopping list is empty',
  listEmptyHint:
    'Missing an essential ingredient in a recipe? Click one-click add on any recipe card, or type items above.',
  browseRecipes: 'Browse Recipes',
  forRecipe: 'For {title}',
  showingLine: 'Showing {shown} of {total} recipes',
  undoRefresh: 'Undo AI refresh',
  resetFilters: 'Reset Filters',
  generateRecipes: 'Generate Matching Recipes',
  hideFilters: 'Hide Filters & Ingredients',
  showFilters: 'Dietary Filters & Fridge',
  signIn: 'Sign in',
  signUp: 'Create account',
  signOut: 'Sign out',
  signInWithGoogle: 'Continue with Google',
  signInWithEmail: 'Sign in with email',
  createAccount: 'Create account',
  emailAddress: 'Email address',
  password: 'Password',
  authTitle: 'Save your fridge & recipes',
  authIntro: 'Sign in to keep your scans, recipes and shopping list on all your devices.',
  authSignedInAs: 'Signed in as {email}',
  authGuestNote: 'You are browsing as a guest — everything is saved only on this device.',
  authUploadPrompt: 'Upload your local fridge, recipes and lists to your account?',
  authUpload: 'Upload my data',
  authKeepLocal: 'Keep it on this device',
  authSyncing: 'Saving to your account…',
  authSynced: 'Saved to your account',
  authSyncError: 'Could not save to your account. Your data is still safe on this device.',
  authNotConfigured: 'Sign-in is not set up yet.',
  authInvalidCredentials: 'Wrong email or password. Please try again.',
  authEmailExists: 'An account with this email already exists. Try signing in instead.',
  authPasswordTooShort: 'Password must be at least 6 characters.',
  authInvalidEmail: 'Please enter a valid email address.',
  authEmailNotConfirmed: 'Your email is not confirmed yet. Please check your inbox.',
  authErrorGeneric: 'Something went wrong. Please try again.',
  authConfirmEmail: 'Check your inbox — we sent a confirmation link to {email}.',
  authOrDivider: 'or',
  authHaveAccount: 'Already have an account? Sign in',
  authNeedAccount: 'No account yet? Create one',
  adminTitle: 'Admin — users',
  adminIntro: 'Signed-in accounts. Turn Pro on or off for each user.',
  adminNoUsers: 'No signed-in users yet.',
  adminLoading: 'Loading users…',
  adminLoadError: 'Could not load users. Please try again.',
  adminToggleError: 'Could not update Pro status. Please try again.',
  adminPro: 'Pro',
  adminFree: 'Free',
  adminMakePro: 'Make Pro',
  adminRemovePro: 'Remove Pro',
};

const UR: UiStrings = {
  recipes: 'تراکیب',
  shoppingList: 'خریداری کی فہرست',
  mealPlan: 'ہفتہ وار منصوبہ',
  scanFridge: 'فریج اسکین کریں',
  scan: 'اسکین',
  suggestedRecipes: 'تجویز کردہ تراکیب',
  favourites: 'پسندیدہ',
  favouritesOnly: 'صرف پسندیدہ',
  searchPlaceholder: 'پکوان یا اجزاء تلاش کریں…',
  startCooking: 'پکانا شروع کریں',
  ingredients: 'اجزاء',
  ingredientsChecklist: 'اجزاء کی فہرست',
  inFridge: 'فریج میں موجود',
  addToList: 'فہرست میں شامل کریں',
  inList: 'فہرست میں ہے',
  servings: 'سرونگ',
  serving: 'سرونگ',
  caloriesPerServing: 'کیلوریز فی سرونگ',
  totalCalories: 'کل کیلوریز',
  nutrition: 'غذائیت',
  macrosNotProvided: 'اس ترکیب میں پروٹین، کاربوہائیڈریٹس اور چربی درج نہیں۔',
  contains: 'شامل ہے',
  noAllergensDetected: 'درج اجزاء میں کوئی عام الرجین نہیں ملا',
  allergenNote: 'یہ صرف اجزاء کے ناموں پر مبنی ہے — ہمیشہ مصنوعات کے لیبل چیک کریں۔',
  notScalableNote:
    'کچھ مقداروں میں عدد درج نہیں ہے، اس لیے وہ ویسی ہی دکھائی گئی ہیں جیسی ترکیب میں لکھی ہیں۔',
  print: 'پرنٹ کریں',
  backToRecipes: 'تراکیب پر واپس جائیں',
  cookingMode: 'بغیر ہاتھ لگائے پکانے کا موڈ',
  step: 'مرحلہ',
  nextStep: 'اگلا مرحلہ',
  previousStep: 'پچھلا مرحلہ',
  finishRecipe: 'ترکیب مکمل کریں',
  doneCooking: 'پکانا مکمل',
  readAloud: 'مرحلہ بلند آواز سے پڑھیں',
  stopReading: 'پڑھنا بند کریں',
  autoReadNext: 'اگلا مرحلہ خود بخود پڑھیں',
  voiceSpeed: 'آواز کی رفتار',
  voice: 'آواز',
  systemDefault: 'سسٹم کی پہلے سے طے شدہ آواز',
  readStepPrefix: 'مرحلہ {n} از {total}۔',
  readStepShort: 'مرحلہ {n}۔',
  noUrduVoice:
    'اس ڈیوائس پر اردو آواز انسٹال نہیں ہے — بلند آواز سے پڑھنا سسٹم کی پہلے سے طے شدہ آواز سے ہوگا۔',
  allSteps: 'تمام مراحل',
  chefTip: 'باورچی کی تجویز',
  dishComplete: 'پکوان تیار ہے — نوش فرمائیں!',
  itemsToPickUp: 'اشیاء خریدنی ہیں',
  copyList: 'فہرست کاپی کریں',
  copied: 'کاپی ہو گئی',
  clearChecked: 'نشان زدہ صاف کریں',
  addItem: 'شامل کریں',
  quantity: 'مقدار',
  category: 'زمرہ',
  yourFridge: 'آپ کا فریج',
  inYourFridge: 'آپ کے فریج میں',
  dietaryFilters: 'غذائی فلٹرز',
  reset: 'ری سیٹ کریں',
  recentScans: 'حالیہ اسکین',
  addIngredient: 'اجزاء شامل کریں…',
  refreshWithAI: 'AI سے تراکیب تازہ کریں',
  generatingRecipes: 'تراکیب بنائی جا رہی ہیں…',
  uploadPhoto: 'فریج کی تصویر اپ لوڈ کریں',
  useCamera: 'کیمرہ استعمال کریں',
  rescanPhoto: 'موجودہ تصویر دوبارہ اسکین کریں',
  clearScan: 'اسکین صاف کریں اور نمونہ بحال کریں',
  captureAnalyze: 'تصویر لیں اور تجزیہ کریں',
  cancel: 'منسوخ کریں',
  sampleFridge: 'نمونہ فریج — یہ آپ کا اسکین نہیں',
  privacyPolicy: 'پرائیویسی پالیسی',
  terms: 'شرائط و ضوابط',
  mealPlannerTitle: 'ہفتہ وار کھانے کا منصوبہ',
  mealPlannerIntro:
    'ہر دن کے لیے ایک ترکیب منتخب کریں۔ جن ضروری اجزاء کی کمی ہے وہ براہ راست خریداری کی فہرست میں شامل کیے جا سکتے ہیں۔',
  noMealPlanned: 'کوئی کھانا طے نہیں',
  chooseRecipe: 'ترکیب منتخب کریں…',
  addPlanToShoppingList: 'کمی والے اجزاء خریداری کی فہرست میں شامل کریں',
  clearPlan: 'منصوبہ صاف کریں',
  plannedMeals: 'کھانے طے شدہ',
  weekCalories: 'ہفتے کی کل کیلوریز',
  shareTitle: 'فریج اور فہرستیں شیئر کریں',
  shareIntro:
    'اس فریج، خریداری کی فہرست اور کھانے کے منصوبے کی نقل خاندان کو بھیجیں۔ وہ اسے اپنے Fridjo میں درآمد کر سکتے ہیں۔',
  shareLocalNote:
    'صرف مقامی شیئرنگ: لنک میں آپ کے ڈیٹا کی نقل موجود ہے۔ جس کے پاس لنک ہوگا وہ اسے درآمد کر سکتا ہے۔ براہ راست ہم آہنگی نہیں ہے — شیئر کرنے کے بعد کی تبدیلیاں شیئر نہیں ہوتیں۔',
  copyLink: 'شیئر لنک کاپی کریں',
  copyCode: 'شیئر کوڈ کاپی کریں',
  importCode: 'شیئر کوڈ درآمد کریں',
  pasteCodePlaceholder: 'موصول شدہ شیئر کوڈ یہاں چسپاں کریں…',
  import: 'درآمد کریں',
  linkCopied: 'لنک کاپی ہو گیا',
  codeCopied: 'کوڈ کاپی ہو گیا',
  showAllRecipes: 'تمام تراکیب دکھائیں',
  noFavouriteRecipes: 'ابھی کوئی پسندیدہ ترکیب نہیں',
  noRecipesMatch: 'ان فلٹرز سے کوئی ترکیب نہیں ملی',
  language: 'زبان',
  fridges: 'فریج',
  newFridge: 'نیا فریج',
  fridgeNamePlaceholder: 'فریج کا نام، مثلاً گیراج فریج',
  deleteFridge: 'یہ فریج حذف کریں',
  renameFridge: 'اس فریج کا نام تبدیل کریں',
  totalTime: 'کل وقت',
  anyTime: 'کوئی بھی وقت',
  under15Min: '15 منٹ سے کم',
  under30Min: '30 منٹ سے کم',
  under45Min: '45 منٹ سے کم',
  difficulty: 'مشکل کی سطح',
  all: 'تمام',
  easy: 'آسان',
  medium: 'درمیانہ',
  hard: 'مشکل',
  useBy: 'استعمال کی آخری تاریخ',
  save: 'محفوظ کریں',
  items: 'اشیاء',
  noIngredientsYet:
    'ابھی کوئی اجزاء درج نہیں۔ فریج کی تصویر اسکین کریں یا اوپر سے شامل کریں۔',
  quantityOptional: 'مقدار (اختیاری، مثلاً 200 گرام)',
  clear: 'صاف کریں',
  soon: 'جلد',
  scannerTitle: 'اپنا کھلا فریج اسکین کریں، جو کچھ ہے اسی سے پکائیں',
  scannerKicker: 'تصویر سے اجزاء کی شناخت',
  stagePreparing: 'آپ کی تصویر تیار کی جا رہی ہے…',
  stageUploading: 'تصویر اپ لوڈ ہو رہی ہے…',
  stageAnalyzing: 'اجزاء کی شناخت ہو رہی ہے…',
  stageGenerating: 'تراکیب بنائی جا رہی ہیں…',
  stagePolling: 'AI ابھی کام کر رہا ہے — نتائج چیک کیے جا رہے ہیں…',
  fridgePreviewReady: 'فریج کا پیش نظارہ تیار ہے',
  analyzingFridge: 'فریج کا تجزیہ ہو رہا ہے…',
  scanTakesAboutAMinute:
    'AI تجزیے میں عام طور پر تقریباً ایک منٹ لگتا ہے۔ براہ کرم یہ ٹیب کھلا رکھیں۔',
  pollCheckLine:
    'چیک {attempt} از {max} — AI کا انتظار جاری ہے۔ تازہ کاری میں چند منٹ لگ سکتے ہیں؛ براہ کرم یہ ٹیب کھلا رکھیں۔',
  addItemLabel: 'اجزاء یا کریانہ کی چیز',
  quantityPlaceholder: 'مثلاً 200 گرام',
  itemPlaceholder: 'مثلاً فیٹا چیز، تازہ دھنیا، تہینی',
  listEmpty: 'آپ کی خریداری کی فہرست خالی ہے',
  listEmptyHint:
    'کسی ترکیب میں کوئی ضروری اجزاء کم ہے؟ کسی بھی ترکیب کارڈ پر ایک کلک سے شامل کریں، یا اوپر لکھیں۔',
  browseRecipes: 'تراکیب دیکھیں',
  forRecipe: '{title} کے لیے',
  showingLine: '{total} میں سے {shown} تراکیب دکھائی جا رہی ہیں',
  undoRefresh: 'AI تازہ کاری واپس لیں',
  resetFilters: 'فلٹرز ری سیٹ کریں',
  generateRecipes: 'مماثل تراکیب بنائیں',
  hideFilters: 'فلٹرز اور اجزاء چھپائیں',
  showFilters: 'غذائی فلٹرز اور فریج',
  signIn: 'سائن ان کریں',
  signUp: 'اکاؤنٹ بنائیں',
  signOut: 'سائن آؤٹ کریں',
  signInWithGoogle: 'Google سے جاری رکھیں',
  signInWithEmail: 'ای میل سے سائن ان کریں',
  createAccount: 'اکاؤنٹ بنائیں',
  emailAddress: 'ای میل ایڈریس',
  password: 'پاس ورڈ',
  authTitle: 'اپنا فریج اور تراکیب محفوظ کریں',
  authIntro: 'اپنی اسکینز، تراکیب اور خریداری کی فہرست تمام آلات پر رکھنے کے لیے سائن ان کریں۔',
  authSignedInAs: '{email} کے طور پر سائن ان ہیں',
  authGuestNote: 'آپ بطور مہمان استعمال کر رہے ہیں — سب کچھ صرف اسی آلے پر محفوظ ہے۔',
  authUploadPrompt: 'اپنا مقامی فریج، تراکیب اور فہرستیں اپنے اکاؤنٹ پر اپ لوڈ کریں؟',
  authUpload: 'میرا ڈیٹا اپ لوڈ کریں',
  authKeepLocal: 'اسی آلے پر رکھیں',
  authSyncing: 'آپ کے اکاؤنٹ میں محفوظ ہو رہا ہے…',
  authSynced: 'آپ کے اکاؤنٹ میں محفوظ ہو گیا',
  authSyncError: 'آپ کے اکاؤنٹ میں محفوظ نہیں ہو سکا۔ آپ کا ڈیٹا اسی آلے پر محفوظ ہے۔',
  authNotConfigured: 'سائن ان ابھی سیٹ اپ نہیں ہوا۔',
  authInvalidCredentials: 'ای میل یا پاس ورڈ غلط ہے۔ دوبارہ کوشش کریں۔',
  authEmailExists: 'اس ای میل سے اکاؤنٹ پہلے سے موجود ہے۔ سائن ان کرنے کی کوشش کریں۔',
  authPasswordTooShort: 'پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔',
  authInvalidEmail: 'براہ کرم درست ای میل ایڈریس لکھیں۔',
  authEmailNotConfirmed: 'آپ کا ای میل ابھی تصدیق شدہ نہیں ہے۔ اپنا ان باکس چیک کریں۔',
  authErrorGeneric: 'کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔',
  authConfirmEmail: 'اپنا ان باکس چیک کریں — {email} پر تصدیقی لنک بھیجا گیا ہے۔',
  authOrDivider: 'یا',
  authHaveAccount: 'پہلے سے اکاؤنٹ ہے؟ سائن ان کریں',
  authNeedAccount: 'ابھی اکاؤنٹ نہیں ہے؟ ایک بنائیں',
  adminTitle: 'ایڈمن — صارفین',
  adminIntro: 'سائن ان شدہ اکاؤنٹس۔ ہر صارف کے لیے Pro آن یا آف کریں۔',
  adminNoUsers: 'ابھی کوئی سائن ان شدہ صارف نہیں۔',
  adminLoading: 'صارفین لوڈ ہو رہے ہیں…',
  adminLoadError: 'صارفین لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔',
  adminToggleError: 'Pro کی حیثیت تبدیل نہیں ہو سکی۔ دوبارہ کوشش کریں۔',
  adminPro: 'Pro',
  adminFree: 'مفت',
  adminMakePro: 'Pro بنائیں',
  adminRemovePro: 'Pro ہٹائیں',
};

export const STRINGS: Record<Language, UiStrings> = { en: EN, ur: UR };

export function getStrings(lang: Language): UiStrings {
  return STRINGS[lang] || STRINGS.en;
}

/** Fill `{placeholder}` values in a UI string. */
export function fmt(
  template: string,
  vars: Record<string, string | number>,
): string {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ur';
}
