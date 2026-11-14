export const letterNames={"أ":"أَلِف","ب":"بَاء","ت":"تَاء","ث":"ثَاء","ج":"جِيم","ح":"حَاء","خ":"خَاء","د":"دَال","ذ":"ذَال","ر":"رَاء","ز":"زَاي","س":"سِين","ش":"شِين","ص":"صَاد","ض":"ضَاد","ط":"طَاء","ظ":"ظَاء","ع":"عَيْن","غ":"غَيْن","ف":"فَاء","ق":"قَاف","ك":"كَاف","ل":"لَام","م":"مِيم","ن":"نُون","ه":"هَاء","و":"وَاو","ي":"يَاء"};
const marks=['َ','ِ','ُ','ْ'], labels=['فَتْحَة','كَسْرَة','ضَمَّة','سُكُون'];
export function syllable(letter,vowel){return (letter==='أ'&&vowel===1?'إ':letter)+marks[vowel]}
export function pronunciation(letter,vowel,word){return [letterNames[letter]+' مَعَ '+labels[vowel],syllable(letter,vowel),word].join(' . ')}
