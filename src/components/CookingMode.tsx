import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { IngredientItem, Recipe, ShoppingListItem } from '../types/culinary';
import {
  formatTimerSeconds,
  isIngredientInShoppingList,
} from '../utils/recipeLogic';

interface CookingModeProps {
  recipe: Recipe;
  shoppingList: ShoppingListItem[];
  onAddMissingToShoppingList: (
    ingredient: IngredientItem,
    recipeTitle: string,
  ) => void;
  onExit: () => void;
}

function playTimerChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.16 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.46);
    });
  } catch {
    // Ignore audio context errors when autoplay/audio is restricted
  }
}

export function CookingMode({
  recipe,
  shoppingList,
  onAddMissingToShoppingList,
  onExit,
}: CookingModeProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [completedMessage, setCompletedMessage] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(() => {
    try {
      return localStorage.getItem('mise_tts_voice_v1');
    } catch {
      return null;
    }
  });

  const steps = recipe.steps.length > 0
    ? recipe.steps
    : [{ stepNumber: 1, instruction: 'Prepare and combine all ingredients.' }];
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  const initialTimerSeconds = (currentStep.durationMinutes || 0) * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(initialTimerSeconds);
  const [timerRunning, setTimerRunning] = useState(false);

  const speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available voices (they arrive asynchronously in most browsers).
  useEffect(() => {
    if (!speechSupported) return;
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) setVoices(list);
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [speechSupported]);

  useEffect(() => {
    try {
      if (voiceURI) {
        localStorage.setItem('mise_tts_voice_v1', voiceURI);
      } else {
        localStorage.removeItem('mise_tts_voice_v1');
      }
    } catch {
      // Ignore storage errors
    }
  }, [voiceURI]);

  const stopSpeech = useCallback(() => {
    if (speechSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [speechSupported]);

  const speakStep = useCallback(
    (textToSpeak: string, rate: number) => {
      if (!speechSupported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = rate;
      const voice = voices.find((v) => v.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    },
    [speechSupported, voices, voiceURI],
  );

  // Reset timer when changing steps
  useEffect(() => {
    const secs = (currentStep.durationMinutes || 0) * 60;
    setRemainingSeconds(secs);
    setTimerRunning(false);
    setCompletedMessage(false);
  }, [stepIndex, currentStep.durationMinutes]);

  // Auto-read when step changes if autoRead is active
  useEffect(() => {
    if (autoRead) {
      const fullText = `Step ${currentStep.stepNumber} of ${steps.length}. ${currentStep.instruction}${
        currentStep.tip ? ` Chef tip: ${currentStep.tip}` : ''
      }`;
      speakStep(fullText, speechRate);
    } else {
      stopSpeech();
    }
    return () => {
      if (speechSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [
    stepIndex,
    autoRead,
    currentStep.stepNumber,
    currentStep.instruction,
    currentStep.tip,
    steps.length,
    speechRate,
    speakStep,
    stopSpeech,
    speechSupported,
  ]);

  // Countdown tick
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          playTimerChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const goPrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setCompletedMessage(true);
      stopSpeech();
    }
  }, [stepIndex, steps.length, stopSpeech]);

  // Keyboard shortcuts for hands-free counter taps
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (isSpeaking) {
          stopSpeech();
        } else {
          const text = `Step ${currentStep.stepNumber}. ${currentStep.instruction}`;
          speakStep(text, speechRate);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [
    goNext,
    goPrev,
    isSpeaking,
    stopSpeech,
    speakStep,
    currentStep.stepNumber,
    currentStep.instruction,
    speechRate,
  ]);

  const progressPct = Math.round(((stepIndex + 1) / steps.length) * 100);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={() => {
            stopSpeech();
            onExit();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Recipes</span>
        </button>

        <div className="text-center">
          <p className="text-xs font-medium text-slate-500">
            Hands-Free Cooking Mode
          </p>
          <h1 className="font-display text-lg font-semibold text-slate-900 sm:text-xl">
            {recipe.title}
          </h1>
        </div>

        <div className="font-mono text-sm font-medium text-slate-700 tabular-nums">
          Step {stepIndex + 1} of {steps.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Cooking progress"
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full bg-emerald-700 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Main Large-Text Step Surface */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
          {/* Read-Aloud Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={!speechSupported}
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeech();
                  } else {
                    const text = `Step ${currentStep.stepNumber} of ${steps.length}. ${currentStep.instruction}${
                      currentStep.tip ? ` Chef tip: ${currentStep.tip}` : ''
                    }`;
                    speakStep(text, speechRate);
                  }
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                  isSpeaking
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isSpeaking ? (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isSpeaking ? 'Stop Reading' : 'Read Step Aloud'}</span>
              </button>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={autoRead}
                  disabled={!speechSupported}
                  onChange={(e) => setAutoRead(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                />
                <span>Auto-read next step</span>
              </label>

              {speechSupported && voices.length > 0 ? (
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  <span className="text-xs text-slate-500">Voice</span>
                  <select
                    value={voiceURI || ''}
                    onChange={(e) => setVoiceURI(e.target.value || null)}
                    aria-label="Read-aloud voice"
                    className="max-w-44 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-sm focus:border-emerald-700 focus:outline-none"
                  >
                    <option value="">System default</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 mr-1">
                Voice speed
              </span>
              {[0.9, 1.0, 1.15].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setSpeechRate(rate)}
                  className={`rounded-md border px-2.5 py-1 font-mono text-xs tabular-nums transition-colors ${
                    speechRate === rate
                      ? 'border-emerald-700 bg-emerald-50 font-semibold text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {!speechSupported ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
              Read-aloud is not supported in this browser. Try Chrome, Edge,
              or Safari on your phone to hear the steps read out.
            </p>
          ) : null}

          {/* Large Step Typography */}
          <div className="py-8 sm:py-10">
            <p className="font-mono text-sm font-medium text-emerald-800 tabular-nums">
              Step {currentStep.stepNumber}
            </p>
            <p className="mt-3 font-display text-2xl font-medium leading-snug text-slate-900 sm:text-3xl lg:text-4xl">
              {currentStep.instruction}
            </p>

            {currentStep.tip ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-700">
                <span className="font-semibold text-slate-900">Chef tip: </span>
                {currentStep.tip}
              </div>
            ) : null}

            {/* Built-in Step Timer */}
            {currentStep.durationMinutes ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Step Timer ({currentStep.durationMinutes} min recommended)
                    </p>
                    <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                      {formatTimerSeconds(remainingSeconds)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!timerRunning && remainingSeconds === 0) {
                        setRemainingSeconds(initialTimerSeconds);
                      }
                      setTimerRunning((r) => !r);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    {timerRunning ? (
                      <Pause className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Play className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {timerRunning
                        ? 'Pause'
                        : remainingSeconds > 0 &&
                            remainingSeconds < initialTimerSeconds
                          ? 'Resume'
                          : 'Start Timer'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimerRunning(false);
                      setRemainingSeconds((currentStep.durationMinutes || 0) * 60);
                    }}
                    aria-label="Reset step timer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            ) : null}

            {completedMessage ? (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <div>
                  <p className="font-semibold">Dish complete — enjoy your meal!</p>
                  <p className="text-sm text-emerald-800">
                    You finished all {steps.length} steps for {recipe.title}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExit}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
                >
                  Done Cooking
                </button>
              </div>
            ) : null}
          </div>

          {/* Large Step Navigation Controls */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={goPrev}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base font-semibold text-slate-800 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              <span className="sm:hidden">Previous</span>
              <span className="hidden sm:inline">Previous Step</span>
            </button>

            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 sm:px-6 sm:py-3.5 text-sm sm:text-base font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-800"
            >
              <span className="sm:hidden">
                {stepIndex === steps.length - 1 ? 'Finish' : 'Next Step'}
              </span>
              <span className="hidden sm:inline">
                {stepIndex === steps.length - 1 ? 'Finish Recipe' : 'Next Step'}
              </span>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Hands-free shortcuts: press Spacebar to read or pause aloud, Left/Right arrows to move between steps.
          </p>
        </div>

        {/* Right: Step Overview & Ingredients Needed */}
        <aside className="lg:col-span-4 space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">
              Ingredients Checklist
            </h2>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'} · {recipe.calories} kcal per serving
            </p>
            <ul className="mt-4 space-y-2.5">
              {recipe.ingredients.map((ing) => {
                const inList = isIngredientInShoppingList(
                  ing.name,
                  shoppingList,
                );
                return (
                  <li
                    key={ing.name}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{ing.name}</p>
                      <p className="text-xs text-slate-500">{ing.amount}</p>
                    </div>
                    {ing.inFridge ? (
                      <span className="text-xs font-medium text-emerald-700 shrink-0">
                        In fridge
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={inList}
                        onClick={() =>
                          onAddMissingToShoppingList(ing, recipe.title)
                        }
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                          inList
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                        }`}
                      >
                        {inList ? (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>{inList ? 'In list' : 'Add to list'}</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">All Steps</h2>
            <ol className="mt-3 space-y-2">
              {steps.map((step, idx) => {
                const active = idx === stepIndex;
                return (
                  <li key={step.stepNumber}>
                    <button
                      type="button"
                      onClick={() => setStepIndex(idx)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        active
                          ? 'border-emerald-700 bg-emerald-50/70 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold text-emerald-800 tabular-nums">
                        Step {step.stepNumber}
                      </span>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed">
                        {step.instruction}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
