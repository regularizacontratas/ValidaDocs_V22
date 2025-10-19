import { useState, useEffect, useMemo, useRef } from 'react';
import { Brain, CheckCircle, Clock, FileSearch, Sparkles, Zap } from 'lucide-react';

interface AIProcessingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  duration?: number; // en segundos
}

export function AIProcessingModal({
  isOpen,
  onComplete,
  duration = 7,
}: AIProcessingModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 🔒 onComplete estable (evita recrear el useEffect)
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // ✅ Memoriza los pasos (no cambia en cada render)
  const steps = useMemo(
    () => [
      { icon: FileSearch, label: 'Extrayendo datos del documento...', color: 'text-blue-500' },
      { icon: Brain, label: 'Analizando con inteligencia artificial...', color: 'text-purple-500' },
      { icon: Zap, label: 'Validando información...', color: 'text-yellow-500' },
      { icon: CheckCircle, label: 'Finalizando análisis...', color: 'text-green-500' },
    ],
    []
  );

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStep(0);
      setIsCompleting(false);
      setElapsedTime(0);
      return;
    }

    const updateInterval = 100; // ms
    const totalUpdates = (duration * 1000) / updateInterval;

    let currentTime = 0;

    const interval = setInterval(() => {
      currentTime += updateInterval;
      const newProgress = Math.min((currentTime / (duration * 1000)) * 100, 100);
      const stepIndex = Math.min(Math.floor(newProgress / 25), steps.length - 1);

      setElapsedTime(currentTime);
      setProgress(newProgress);
      setCurrentStep(stepIndex);

      if (newProgress >= 100) {
        clearInterval(interval);
        setIsCompleting(true);
        setTimeout(() => onCompleteRef.current(), 500);
      }
    }, updateInterval);

    // 🔐 Limpieza segura
    return () => clearInterval(interval);
  }, [isOpen, duration, steps.length]);

  if (!isOpen) return null;

  const CurrentIcon = steps[currentStep].icon;
  const timeRemaining = Math.max(0, Math.ceil(duration - elapsedTime / 1000));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 mb-4">
            <CurrentIcon className={`w-10 h-10 ${steps[currentStep].color} animate-pulse`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Procesando con IA</h2>
          <p className="text-gray-600 text-sm">{steps[currentStep].label}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progreso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-linear"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-between mb-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex flex-col items-center ${
                index <= currentStep ? 'opacity-100' : 'opacity-30'
              } transition-opacity duration-500`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-blue-500 text-white animate-pulse'
                    : 'bg-gray-300'
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Time Remaining */}
        <div className="text-center">
          {!isCompleting ? (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Tiempo restante: {timeRemaining}s</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Sparkles className="w-5 h-5 animate-spin" />
              <span className="font-medium">¡Listo! Procesando en segundo plano...</span>
            </div>
          )}
        </div>

        {/* Info Message */}
        {progress > 50 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center animate-fadeIn">
            <p className="text-xs text-blue-700">
              💡 Puedes continuar trabajando mientras procesamos tu documento
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
