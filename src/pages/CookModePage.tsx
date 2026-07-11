import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChefHat,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { parseDurations, parseVoiceCommand } from "../lib/product";
import { notify } from "../components/feedback-events";

type Step = { id: string; instruction: string; position: number };
type Ingredient = { id: string; name: string; quantity_text: string | null };

type Recipe = {
  id: string;
  title: string;
  recipe_steps: Step[];
  recipe_ingredients: Ingredient[];
};

type Timer = {
  id: string;
  label: string;
  endsAt: number;
  remaining: number;
  running: boolean;
  duration?: number;
};

type Recognition = {
  start: () => void;
  stop: () => void;
  continuous: boolean;
  lang: string;
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export function CookModePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [step, setStep] = useState(() =>
    Number(localStorage.getItem(`kooki-step-${id}`) ?? 0),
  );
  const [timers, setTimers] = useState<Timer[]>(
    () => JSON.parse(localStorage.getItem("kooki-timers") ?? "[]") as Timer[],
  );
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("recipes")
      .select("id,title,recipe_steps(*),recipe_ingredients(*)")
      .eq("id", id)
      .single()
      .then(({ data }) => setRecipe(data as Recipe));
  }, [id]);

  useEffect(() => {
    localStorage.setItem(`kooki-step-${id}`, String(step));
  }, [step, id]);

  useEffect(() => {
    const interval = setInterval(
      () =>
        setTimers((current) =>
          current
            .map((timer) =>
              timer.running
                ? {
                    ...timer,
                    remaining: Math.max(
                      0,
                      Math.ceil((timer.endsAt - Date.now()) / 1000),
                    ),
                  }
                : timer,
            )
            .filter((timer) => {
              if (timer.running && timer.endsAt <= Date.now()) {
                notify("success", `Temporizador concluído: ${timer.label}`);
                navigator.vibrate?.([200, 100, 200]);
                if (
                  "Notification" in window &&
                  Notification.permission === "granted"
                )
                  new Notification("Temporizador concluído", {
                    body: timer.label,
                  });
                const AudioContextClass = window.AudioContext;
                if (AudioContextClass) {
                  const context = new AudioContextClass();
                  const oscillator = context.createOscillator();
                  oscillator.connect(context.destination);
                  oscillator.frequency.value = 880;
                  oscillator.start();
                  oscillator.stop(context.currentTime + 0.35);
                }
                return false;
              }
              return true;
            }),
        ),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(
    () => localStorage.setItem("kooki-timers", JSON.stringify(timers)),
    [timers],
  );

  const current = recipe?.recipe_steps.sort((a, b) => a.position - b.position)[
    step
  ];
  const durations = useMemo(
    () => parseDurations(current?.instruction ?? ""),
    [current],
  );

  function addTimer(seconds: number, label: string) {
    if ("Notification" in window && Notification.permission === "default")
      void Notification.requestPermission();
    setTimers((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        label,
        endsAt: Date.now() + seconds * 1000,
        remaining: seconds,
        running: true,
        duration: seconds,
      },
    ]);
    notify("info", `Temporizador iniciado: ${label}`);
  }

  function toggleTimer(timer: Timer) {
    setTimers((items) =>
      items.map((item) =>
        item.id === timer.id
          ? {
              ...item,
              running: !item.running,
              endsAt: !item.running
                ? Date.now() + item.remaining * 1000
                : item.endsAt,
            }
          : item,
      ),
    );
  }

  function speak(text: string) {
    if (!speechSynthesis) return;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  function command(text: string) {
    const parsed = parseVoiceCommand(text);
    if (parsed === "next")
      setStep((value) =>
        Math.min((recipe?.recipe_steps.length ?? 1) - 1, value + 1),
      );
    else if (parsed === "previous") setStep((value) => Math.max(0, value - 1));
    else if (parsed === "repeat" || parsed === "step")
      speak(current?.instruction ?? "");
    else if (parsed === "ingredients")
      speak(
        recipe?.recipe_ingredients
          .map((item) => `${item.quantity_text ?? ""} ${item.name}`)
          .join(". ") ?? "",
      );
    else if (parsed === "start_timer" && durations[0])
      addTimer(durations[0].seconds, durations[0].label);
    else if (parsed === "pause_timer") {
      const active = timers.find((timer) => timer.running);
      if (active) toggleTimer(active);
      else notify("info", "Nenhum temporizador ativo");
    } else if (parsed === "resume_timer") {
      const paused = timers.find((timer) => !timer.running);
      if (paused) toggleTimer(paused);
      else notify("info", "Nenhum temporizador pausado");
    } else notify("info", "Comando não reconhecido", text);
  }

  function voice() {
    const Constructor =
      (
        window as unknown as {
          SpeechRecognition?: new () => Recognition;
          webkitSpeechRecognition?: new () => Recognition;
        }
      ).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition })
        .webkitSpeechRecognition;
    if (!Constructor) {
      notify("info", "Controle por voz indisponível neste navegador");
      return;
    }
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const instance = new Constructor();
    instance.lang = "pt-BR";
    instance.continuous = true;
    instance.onresult = (event) =>
      command(event.results[event.results.length - 1][0].transcript);
    instance.onerror = () =>
      notify("error", "Não foi possível ouvir o comando");
    instance.onend = () => setListening(false);
    recognition.current = instance;
    instance.start();
    setListening(true);
  }

  if (!recipe || !current)
    return (
      <div className="state min-h-screen justify-center">
        <ChefHat className="animate-bounce text-primary w-12 h-12" />
        <strong>Carregando Modo Cozinha…</strong>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 min-h-[80vh] justify-between pb-24">
      {/* Header */}
      <header className="flex justify-between items-center bg-surface border border-border p-4 rounded-2xl shadow-sm">
        <div>
          <span className="eyebrow">MODO COZINHA</span>
          <h1 className="text-xl font-serif truncate max-w-[200px] md:max-w-sm">{recipe.title}</h1>
        </div>
        <div className="flex gap-2">
          <button
            className={`button ${listening ? "bg-red-500 animate-pulse text-white" : "secondary"} px-4 py-2 min-h-0 text-xs`}
            onClick={voice}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {listening ? "Parar mãos livres" : "Mãos livres"}
          </button>
          <button className="icon-button w-9 h-9 border-none bg-surface-muted" onClick={() => navigate(`/receitas/${id}`)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main step section */}
      <main className="bg-surface border border-border rounded-3xl p-8 shadow-sm flex flex-col gap-8 items-center text-center justify-center flex-grow min-h-[350px]">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary text-xs font-extrabold px-3 py-1 rounded-full border border-primary/20">
            Etapa {step + 1} de {recipe.recipe_steps.length}
          </span>
        </div>

        <p className="text-2xl md:text-3xl font-serif font-semibold text-text-primary leading-relaxed max-w-xl">
          {current.instruction}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button className="button secondary py-2 min-h-0 text-xs font-semibold gap-1.5" onClick={() => speak(current.instruction)}>
            <Volume2 className="w-4 h-4 text-primary" /> Ler passo em voz alta
          </button>

          {durations.map((duration) => (
            <button
              className="button py-2 min-h-0 text-xs font-semibold gap-1.5"
              onClick={() => addTimer(duration.seconds, duration.label)}
              key={duration.label}
            >
              <Bell className="w-4 h-4" /> Iniciar timer {duration.label}
            </button>
          ))}
        </div>
      </main>

      {/* Navigation and Timers */}
      <div className="flex flex-col gap-4">
        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <button
            className="button secondary flex-grow"
            disabled={step === 0}
            onClick={() => setStep((value) => value - 1)}
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <button
            className="button flex-grow"
            disabled={step === recipe.recipe_steps.length - 1}
            onClick={() => setStep((value) => value + 1)}
          >
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Timers Area */}
        {timers.length > 0 && (
          <aside className="bg-surface border border-border p-4 rounded-2xl shadow-md flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase text-text-secondary flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" /> Temporizadores ativos
            </h3>
            <div className="flex flex-col gap-2.5">
              {timers.map((timer) => (
                <div key={timer.id} className="flex justify-between items-center bg-surface-muted/50 p-3 rounded-xl border border-border/40">
                  <div className="flex-grow">
                    <strong className="text-sm font-semibold text-text-primary block">{timer.label}</strong>
                    <span className="text-[10px] text-text-secondary">Restante</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold font-mono text-primary tabular-nums">
                      {Math.floor(timer.remaining / 60)}:
                      {String(timer.remaining % 60).padStart(2, "0")}
                    </span>
                    <button
                      className="icon-button w-8 h-8 min-w-0 min-h-0 border-none bg-surface"
                      onClick={() => toggleTimer(timer)}
                    >
                      {timer.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      className="icon-button w-8 h-8 min-w-0 min-h-0 border-none bg-surface text-text-secondary"
                      onClick={() =>
                        setTimers((items) =>
                          items.map((item) =>
                            item.id === timer.id
                              ? {
                                  ...item,
                                  remaining: item.duration ?? item.remaining,
                                  endsAt: Date.now() + (item.duration ?? item.remaining) * 1000,
                                  running: true,
                                }
                              : item,
                          ),
                        )
                      }
                      aria-label="Reiniciar"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      className="icon-button w-8 h-8 min-w-0 min-h-0 border-none bg-surface text-destructive"
                      onClick={() =>
                        setTimers((items) => items.filter((item) => item.id !== timer.id))
                      }
                      aria-label="Deletar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
