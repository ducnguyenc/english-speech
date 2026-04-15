import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

/**
 * Configure Pronunciation Assessment
 * @param {string} subscriptionKey 
 * @param {string} serviceRegion 
 * @param {string} targetText 
 * @param {string} language - Language code (e.g., 'en-US', 'ja-JP')
 * @param {function} onStatusChange - Callback for status updates
 * @returns {object} - Object containing start and stop functions
 */
export const createPronunciationAssessment = (subscriptionKey, serviceRegion, targetText, language = 'en-US', onStatusChange = () => { }) => {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    speechConfig.speechRecognitionLanguage = language;

    // Configure for high precision
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const pronunciationConfig = new SpeechSDK.PronunciationAssessmentConfig(
        targetText,
        SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
        true
    );
    pronunciationConfig.phonemeAlphabet = "IPA";

    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationConfig.applyTo(recognizer);

    let finalResult = null;

    return {
        start: () => {
            return new Promise((resolve, reject) => {
                onStatusChange('listening');

                recognizer.recognized = (s, e) => {
                    if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                        const pResult = SpeechSDK.PronunciationAssessmentResult.fromResult(e.result);
                        const words = e.result.privJson ? JSON.parse(e.result.privJson).NBest[0].Words : [];

                        finalResult = {
                            accuracyScore: pResult.accuracyScore,
                            fluencyScore: pResult.fluencyScore,
                            completenessScore: pResult.completenessScore,
                            overallScore: pResult.pronunciationScore,
                            words: words.map(w => ({
                                word: w.Word,
                                accuracyScore: w.PronunciationAssessment.AccuracyScore,
                                syllables: w.Syllables ? w.Syllables.map(s => ({
                                    syllable: s.Syllable,
                                    score: s.PronunciationAssessment.AccuracyScore
                                })) : [],
                                phonemes: w.Phonemes ? w.Phonemes.map(p => ({
                                    phoneme: p.Phoneme,
                                    score: p.PronunciationAssessment.AccuracyScore
                                })) : []
                            }))
                        };
                    }
                };

                recognizer.canceled = (s, e) => {
                    onStatusChange('error');
                    reject(e.errorDetails);
                };

                recognizer.startContinuousRecognitionAsync(
                    () => resolve(),
                    (err) => {
                        onStatusChange('error');
                        reject(err);
                    }
                );
            });
        },
        stop: () => {
            return new Promise((resolve) => {
                onStatusChange('analyzing');
                recognizer.stopContinuousRecognitionAsync(
                    () => {
                        onStatusChange('done');
                        resolve(finalResult || Promise.reject('Không nghe thấy gì. Hãy thử lại.'));
                        recognizer.close();
                    },
                    (err) => {
                        onStatusChange('error');
                        resolve(null);
                        recognizer.close();
                    }
                );
            });
        }
    };
};
