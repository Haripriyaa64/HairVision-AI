"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  ImagePlus,
  Loader2,
  ScanFace,
  Scissors,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";

import {
  analyzeFace,
  getHealth,
  getRecommendations,
  tryOnHairstyle,
  type AnalyzeResponse,
  type FaceShape,
  type Gender,
  type HairstyleRecommendation,
} from "@/lib/api";


// ============================================================
// PAGE
// ============================================================

export default function Home() {

  const inputRef =
    useRef<HTMLInputElement>(null);

  const [apiConnected, setApiConnected] =
    useState(false);

  const [file, setFile] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState<string | null>(null);

  const [dragging, setDragging] =
    useState(false);

  const [analysis, setAnalysis] =
    useState<AnalyzeResponse | null>(null);

  const [gender, setGender] =
    useState<Gender>("men");

  const [recommendations, setRecommendations] =
    useState<HairstyleRecommendation[]>([]);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [loadingRecommendations, setLoadingRecommendations] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] =
    useState<HairstyleRecommendation | null>(null);

  const [tryOnLoading, setTryOnLoading] =
    useState(false);

  const [tryOnResult, setTryOnResult] =
    useState<string | null>(null);


  // ==========================================================
  // HEALTH
  // ==========================================================

  useEffect(() => {

    getHealth()
      .then(() => {
        setApiConnected(true);
      })
      .catch(() => {
        setApiConnected(false);
      });

  }, []);


  // ==========================================================
  // FILE
  // ==========================================================

  function handleFile(
    selectedFile: File
  ) {

    setError(null);

    if (
      !selectedFile.type.startsWith(
        "image/"
      )
    ) {

      setError(
        "Please upload a JPG, PNG or WEBP image."
      );

      return;
    }

    if (
      selectedFile.size >
      10 * 1024 * 1024
    ) {

      setError(
        "Image must be smaller than 10 MB."
      );

      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const objectUrl =
      URL.createObjectURL(
        selectedFile
      );

    setFile(selectedFile);
    setPreview(objectUrl);

    setAnalysis(null);
    setRecommendations([]);
    setSelectedStyle(null);
    setTryOnResult(null);
  }


  function handleInputChange(
    event: ChangeEvent<HTMLInputElement>
  ) {

    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      handleFile(selectedFile);
    }
  }


  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {

    event.preventDefault();

    setDragging(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleFile(droppedFile);
    }
  }


  function removeImage() {

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setRecommendations([]);
    setSelectedStyle(null);
    setTryOnResult(null);
    setError(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }


  // ==========================================================
  // ANALYZE
  // ==========================================================

  async function handleAnalyze() {

    if (!file) {

      setError(
        "Please upload a photo first."
      );

      return;
    }

    setAnalyzing(true);
    setError(null);

    try {

      const result =
        await analyzeFace(file);

      setAnalysis(result);

      setLoadingRecommendations(true);

      const styles =
        await getRecommendations(
          result.face_shape,
          gender,
          8
        );

      setRecommendations(
        styles
      );

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );

    } finally {

      setAnalyzing(false);
      setLoadingRecommendations(false);
    }
  }


  // ==========================================================
  // GENDER
  // ==========================================================

  async function handleGenderChange(
    value: Gender
  ) {

    setGender(value);
    setSelectedStyle(null);
    setTryOnResult(null);

    if (!analysis) {
      return;
    }

    setLoadingRecommendations(true);
    setError(null);

    try {

      const styles =
        await getRecommendations(
          analysis.face_shape,
          value,
          8
        );

      setRecommendations(
        styles
      );

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update recommendations."
      );

    } finally {

      setLoadingRecommendations(false);
    }
  }


  // ==========================================================
  // SELECT STYLE
  // ==========================================================

  function handleSelectStyle(
    style: HairstyleRecommendation
  ) {

    setSelectedStyle(style);
    setTryOnResult(null);
    setError(null);
  }


  // ==========================================================
  // REAL AI TRY-ON
  // ==========================================================

  async function handleGenerateLook() {

    if (!file) {

      setError(
        "Please upload your photo first."
      );

      return;
    }

    if (!selectedStyle) {

      setError(
        "Please select a hairstyle first."
      );

      return;
    }

    // Frontend protection
    if (
      selectedStyle.gender !== gender
    ) {

      setError(
        "This hairstyle is not compatible with the selected gender."
      );

      return;
    }

    setTryOnLoading(true);
    setTryOnResult(null);
    setError(null);

    try {

      const result =
        await tryOnHairstyle(
          file,
          selectedStyle.id,
          gender
        );

      if (
        !result.success ||
        !result.image
      ) {

        throw new Error(
          "AI did not return a generated image."
        );
      }

      setTryOnResult(
        result.image
      );

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate your hairstyle."
      );

    } finally {

      setTryOnLoading(false);
    }
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070708] text-white">

      <AmbientBackground />


      {/* ======================================================
          NAVIGATION
      ====================================================== */}

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">

        <motion.div
          initial={{
            opacity: 0,
            y: -12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="flex items-center gap-3"
        >

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl">
            <Scissors size={18} />
          </div>

          <div>

            <div className="text-[15px] font-semibold tracking-tight">
              HairVision
              <span className="text-white/35">
                {" "}AI
              </span>
            </div>

            <div className="text-[9px] uppercase tracking-[0.25em] text-white/25">
              Hair intelligence
            </div>

          </div>

        </motion.div>


        <div className="hidden items-center gap-8 text-xs text-white/40 md:flex">

          <span className="text-white">
            Analyze
          </span>

          <span>
            Discover
          </span>

          <span>
            Try-On
          </span>

          <Link
            href="/ar-try-on"
            className="flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            AR Try-On
          </Link>

          <a
            href="/find-salons"
            className="transition-colors hover:text-white"
          >
            Find Salons
          </a>

        </div>


        <div className="flex items-center gap-3">

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-white/45 sm:flex">

            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiConnected
                  ? "bg-emerald-400"
                  : "bg-red-400"
              }`}
            />

            {apiConnected
              ? "AI Online"
              : "AI Offline"}

          </div>


          <button
            type="button"
            className="hidden rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs text-white/70 transition hover:bg-white/[0.08] sm:block"
          >
            Sign in
          </button>


          <CircleUserRound
            className="text-white/50 sm:hidden"
            size={21}
          />

        </div>

      </nav>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-10 lg:pt-20">


        {/* ====================================================
            HERO
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.7,
          }}
          className="mx-auto max-w-4xl text-center"
        >

          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/45 backdrop-blur-xl">

            <Sparkles size={12} />

            Personalized hair intelligence

          </div>


          <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-6xl lg:text-8xl">

            Find the hair

            <br />

            <span className="bg-gradient-to-r from-white via-white to-white/35 bg-clip-text text-transparent">
              that fits you.
            </span>

          </h1>


          <p className="mx-auto mt-7 max-w-xl text-sm leading-6 text-white/40 sm:text-base">

            Upload your photo. Let HairVision
            understand your face and discover
            hairstyles personalized for you.

          </p>

        </motion.div>


        {/* ====================================================
            UPLOADER
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 35,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.15,
            duration: 0.7,
          }}
          className="mx-auto mt-14 max-w-5xl"
        >

          {!preview ? (

            <UploadPanel
              dragging={dragging}
              onDragEnter={() =>
                setDragging(true)
              }
              onDragLeave={() =>
                setDragging(false)
              }
              onDragOver={(event) =>
                event.preventDefault()
              }
              onDrop={handleDrop}
              onClick={() =>
                inputRef.current?.click()
              }
            />

          ) : (

            <PreviewPanel
              preview={preview}
              file={file}
              analyzing={analyzing}
              onRemove={removeImage}
              onAnalyze={handleAnalyze}
            />

          )}


          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />


          <AnimatePresence>

            {error && (

              <motion.div
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-2 rounded-xl border border-red-400/10 bg-red-400/[0.05] px-4 py-3 text-xs text-red-300/80"
              >

                <X size={14} />

                {error}

              </motion.div>

            )}

          </AnimatePresence>

        </motion.div>


        {/* ====================================================
            ANALYSIS
        ==================================================== */}

        <AnimatePresence mode="wait">

          {analysis && (

            <motion.section
              key="analysis"
              initial={{
                opacity: 0,
                y: 30,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
              }}
              className="mx-auto mt-16 max-w-6xl"
            >

              <AnalysisResult
                analysis={analysis}
                gender={gender}
                onGenderChange={
                  handleGenderChange
                }
              />


              {/* ==================================================
                  RECOMMENDATIONS
              ================================================== */}

              <div className="mt-16">

                <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

                  <div>

                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/30">

                      <WandSparkles size={13} />

                      Personalized selection

                    </div>


                    <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">

                      Styles picked for you

                    </h2>


                    <p className="mt-2 text-xs text-white/35">

                      Based on your{" "}
                      {analysis.face_shape}{" "}
                      face shape and selected
                      style category.

                    </p>

                  </div>


                  <div className="flex items-center gap-2 text-xs text-white/30">

                    {recommendations.length}

                    {" "}styles

                    <ChevronDown size={14} />

                  </div>

                </div>


                {loadingRecommendations ? (

                  <LoadingRecommendations />

                ) : recommendations.length > 0 ? (

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    {recommendations.map(
                      (style, index) => (

                        <HairstyleCard
                          key={style.id}
                          style={style}
                          index={index}
                          selected={
                            selectedStyle?.id ===
                            style.id
                          }
                          onTryOn={() =>
                            handleSelectStyle(
                              style
                            )
                          }
                        />

                      )
                    )}

                  </div>

                ) : (

                  <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center text-sm text-white/40">

                    No hairstyles found.

                  </div>

                )}

              </div>

            </motion.section>

          )}

        </AnimatePresence>

      </section>


      {/* ======================================================
          REAL TRY-ON MODAL
      ====================================================== */}

      <AnimatePresence>

        {selectedStyle && (

          <TryOnModal
            style={selectedStyle}
            preview={preview}
            result={tryOnResult}
            loading={tryOnLoading}
            onGenerate={
              handleGenerateLook
            }
            onClose={() => {
              if (!tryOnLoading) {
                setSelectedStyle(null);
                setTryOnResult(null);
              }
            }}
          />

        )}

      </AnimatePresence>


      {/* ======================================================
          STATUS
      ====================================================== */}

      <div className="fixed bottom-5 left-5 z-30 hidden items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-2.5 text-[10px] text-white/35 backdrop-blur-xl sm:flex">

        <span
          className={`h-1.5 w-1.5 rounded-full ${
            apiConnected
              ? "bg-emerald-400"
              : "bg-red-400"
          }`}
        />

        {apiConnected
          ? "HairVision AI connected"
          : "Backend unavailable"}

      </div>

    </main>
  );
}


// ============================================================
// UPLOAD PANEL
// ============================================================

function UploadPanel({
  dragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onClick,
}: {
  dragging: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDragOver: (
    event: DragEvent<HTMLDivElement>
  ) => void;
  onDrop: (
    event: DragEvent<HTMLDivElement>
  ) => void;
  onClick: () => void;
}) {

  return (

    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group relative overflow-hidden rounded-[2rem] border transition duration-500 ${
        dragging
          ? "border-white/30 bg-white/[0.08]"
          : "border-white/[0.09] bg-white/[0.025]"
      }`}
    >

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07),transparent_55%)]" />


      <div className="relative flex min-h-[330px] flex-col items-center justify-center px-6 py-16 text-center">

        <motion.div
          animate={
            dragging
              ? {
                  scale: 1.08,
                  rotate: 2,
                }
              : {
                  scale: 1,
                  rotate: 0,
                }
          }
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-white/10 bg-white/[0.05] shadow-2xl"
        >

          <ScanFace
            size={32}
            strokeWidth={1.3}
            className="text-white/65"
          />

        </motion.div>


        <h2 className="text-xl font-medium tracking-tight">
          Upload your photo
        </h2>


        <p className="mt-2 max-w-sm text-xs leading-5 text-white/30">

          Use a clear, front-facing photo
          with one person. Your face
          should be visible.

        </p>


        <button
          type="button"
          onClick={onClick}
          className="group mt-7 flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-xs font-semibold text-black transition duration-300 hover:scale-[1.03] hover:bg-white/90"
        >

          <Upload size={15} />

          Choose photo

          <ArrowRight
            size={14}
            className="transition-transform group-hover:translate-x-1"
          />

        </button>


        <div className="mt-5 flex items-center gap-3 text-[9px] uppercase tracking-[0.18em] text-white/20">

          <span>JPG</span>
          <span>•</span>
          <span>PNG</span>
          <span>•</span>
          <span>WEBP</span>
          <span>•</span>
          <span>10MB</span>

        </div>

      </div>

    </div>
  );
}


// ============================================================
// PREVIEW PANEL
// ============================================================

function PreviewPanel({
  preview,
  file,
  analyzing,
  onRemove,
  onAnalyze,
}: {
  preview: string;
  file: File | null;
  analyzing: boolean;
  onRemove: () => void;
  onAnalyze: () => void;
}) {

  return (

    <div className="overflow-hidden rounded-[2rem] border border-white/[0.09] bg-white/[0.025]">

      <div className="grid lg:grid-cols-[1fr_0.8fr]">

        <div className="relative min-h-[430px] overflow-hidden bg-black/30">

          <img
            src={preview}
            alt="Uploaded face"
            className="absolute inset-0 h-full w-full object-contain"
          />


          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />


          <button
            type="button"
            onClick={onRemove}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-xl transition hover:bg-black/70 hover:text-white"
          >

            <X size={15} />

          </button>


          <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[10px] text-white/55 backdrop-blur-xl">

            <Camera size={13} />

            {file?.name ?? "Photo"}

          </div>

        </div>


        <div className="flex flex-col justify-center p-8 lg:p-12">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">

            <Sparkles size={17} />

          </div>


          <h2 className="mt-6 text-2xl font-semibold tracking-tight">

            Ready for your analysis?

          </h2>


          <p className="mt-3 max-w-sm text-sm leading-6 text-white/35">

            HairVision will analyze your facial
            proportions and use them to
            personalize your hairstyle discovery.

          </p>


          <button
            type="button"
            onClick={onAnalyze}
            disabled={analyzing}
            className="group mt-8 flex w-fit items-center gap-3 rounded-full bg-white px-6 py-3.5 text-xs font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >

            {analyzing ? (

              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />

                Analyzing...
              </>

            ) : (

              <>
                <ScanFace size={15} />

                Analyze my face

                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />

              </>

            )}

          </button>

        </div>

      </div>

    </div>
  );
}


// ============================================================
// ANALYSIS RESULT
// ============================================================

function AnalysisResult({
  analysis,
  gender,
  onGenderChange,
}: {
  analysis: AnalyzeResponse;
  gender: Gender;
  onGenderChange: (
    gender: Gender
  ) => void;
}) {

  return (

    <div className="overflow-hidden rounded-[2rem] border border-white/[0.09] bg-white/[0.025]">

      <div className="grid lg:grid-cols-[1fr_1.5fr]">


        <div className="border-b border-white/[0.07] p-8 lg:border-b-0 lg:border-r lg:p-10">

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/30">

            <Check
              size={13}
              className="text-emerald-400"
            />

            Analysis complete

          </div>


          <p className="mt-8 text-xs text-white/30">
            Detected face shape
          </p>


          <h2 className="mt-2 text-5xl font-semibold capitalize tracking-[-0.04em]">

            {analysis.face_shape}

          </h2>


          <div className="mt-7">

            <div className="mb-2 flex justify-between text-[10px] text-white/30">

              <span>
                Confidence
              </span>

              <span>

                {Math.round(
                  analysis.confidence * 100
                )}

                %

              </span>

            </div>


            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">

              <motion.div
                initial={{
                  width: 0,
                }}
                animate={{
                  width: `${Math.max(
                    4,
                    analysis.confidence * 100
                  )}%`,
                }}
                transition={{
                  duration: 0.9,
                }}
                className="h-full rounded-full bg-white"
              />

            </div>

          </div>

        </div>


        <div className="p-8 lg:p-10">

          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs text-white/30">
                Style category
              </p>

              <h3 className="mt-1 text-lg font-medium">
                What are you looking for?
              </h3>

            </div>


            <div className="flex rounded-full border border-white/10 bg-black/20 p-1">

              <GenderButton
                active={gender === "men"}
                onClick={() =>
                  onGenderChange("men")
                }
              >
                Men
              </GenderButton>


              <GenderButton
                active={gender === "women"}
                onClick={() =>
                  onGenderChange("women")
                }
              >
                Women
              </GenderButton>

            </div>

          </div>


          <div className="mt-9 grid grid-cols-5 gap-2">

            {(
              Object.entries(
                analysis.probabilities
              ) as [
                FaceShape,
                number
              ][]
            ).map(
              ([shape, probability]) => (

                <div
                  key={shape}
                  className={`rounded-xl border p-3 ${
                    shape ===
                    analysis.face_shape
                      ? "border-white/15 bg-white/[0.07]"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >

                  <div className="text-[9px] capitalize text-white/35">
                    {shape}
                  </div>


                  <div className="mt-2 text-sm font-medium">

                    {Math.round(
                      probability * 100
                    )}

                    %

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </div>

    </div>
  );
}


// ============================================================
// GENDER BUTTON
// ============================================================

function GenderButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {

  return (

    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-[10px] font-medium transition ${
        active
          ? "bg-white text-black"
          : "text-white/35 hover:text-white"
      }`}
    >

      {children}

    </button>
  );
}


// ============================================================
// HAIRSTYLE CARD
// ============================================================

function HairstyleCard({
  style,
  index,
  selected,
  onTryOn,
}: {
  style: HairstyleRecommendation;
  index: number;
  selected: boolean;
  onTryOn: () => void;
}) {

  return (

    <motion.article
      initial={{
        opacity: 0,
        y: 30,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.55,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        y: -6,
      }}
      className={`group relative overflow-hidden rounded-[24px] border bg-[#101013] shadow-[0_20px_60px_rgba(0,0,0,0.25)] ${
        selected
          ? "border-white/30"
          : "border-white/[0.08]"
      }`}
    >

      <ReferenceImage
        styleId={style.id}
        styleName={style.name}
        index={index}
        matchScore={style.match_score}
      />


      <div className="p-5">

        <div className="flex items-start justify-between gap-3">

          <div>

            <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-white">

              {style.name}

            </h3>


            <p className="mt-1 text-[11px] text-white/35">

              {style.gender === "men"
                ? "Recommended for men"
                : "Recommended for women"}

            </p>

          </div>


          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/35 transition group-hover:border-white/15 group-hover:text-white/70">

            <Scissors size={14} />

          </div>

        </div>


        <div className="mt-4 flex flex-wrap gap-1.5">

          {style.tags
            .slice(0, 3)
            .map((tag) => (

              <span
                key={tag}
                className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] capitalize text-white/45"
              >
                {tag}
              </span>

            ))}

        </div>


        <div className="my-5 h-px bg-white/[0.07]" />


        <div className="flex items-center justify-between text-[10px] text-white/35">

          <span className="capitalize">

            {style.length}
            {" · "}
            {style.maintenance}
            {" maintenance"}

          </span>


          <span className="flex items-center gap-1">

            <Clock3 size={11} />

            {style.maintenance}

          </span>

        </div>


        <button
          type="button"
          onClick={onTryOn}
          className="group/button mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-[11px] font-medium text-white/70 transition duration-300 hover:border-white/20 hover:bg-white hover:text-black"
        >

          <WandSparkles
            size={14}
            className="transition-transform duration-300 group-hover/button:rotate-12"
          />

          Try this style

          <ArrowRight
            size={13}
            className="transition-transform duration-300 group-hover/button:translate-x-1"
          />

        </button>

      </div>


      <div
        className={`pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-white/10 transition duration-500 ${
          selected
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        }`}
      />

    </motion.article>
  );
}


// ============================================================
// REFERENCE IMAGE
// ============================================================

function ReferenceImage({
  styleId,
  styleName,
  index,
  matchScore,
}: {
  styleId: string;
  styleName: string;
  index: number;
  matchScore: number;
}) {

  const [
    extensionIndex,
    setExtensionIndex,
  ] = useState(0);

  const extensions = [
    "png",
    "jpg",
    "jpeg",
    "webp",
  ];

  const imagePath =
    `/hairstyles/${styleId}.${extensions[extensionIndex]}`;


  return (

    <div className="relative h-64 overflow-hidden bg-[#151518] sm:h-72">

      <img
        src={imagePath}
        alt={`${styleName} hairstyle reference`}
        className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
        onError={() => {

          if (
            extensionIndex <
            extensions.length - 1
          ) {

            setExtensionIndex(
              extensionIndex + 1
            );

          }

        }}
      />


      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0d10] via-black/10 to-black/20" />


      <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[9px] font-medium tracking-[0.12em] text-white/60 backdrop-blur-xl">

        #{String(index + 1).padStart(2, "0")}

      </div>


      <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-black shadow-xl">

        {Math.round(matchScore)}%

      </div>


      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[8px] font-medium uppercase tracking-[0.16em] text-white/60 backdrop-blur-xl">

        <Sparkles size={10} />

        Reference

      </div>

    </div>
  );
}


// ============================================================
// REAL TRY-ON MODAL
// ============================================================

function TryOnModal({
  style,
  preview,
  result,
  loading,
  onGenerate,
  onClose,
}: {
  style: HairstyleRecommendation;
  preview: string | null;
  result: string | null;
  loading: boolean;
  onGenerate: () => void;
  onClose: () => void;
}) {

  const [
    extensionIndex,
    setExtensionIndex,
  ] = useState(0);

  const extensions = [
    "png",
    "jpg",
    "jpeg",
    "webp",
  ];

  const referencePath =
    `/hairstyles/${style.id}.${extensions[extensionIndex]}`;


  return (

    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-md"
    >

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.96,
          y: 15,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: 0.97,
        }}
        className="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[2rem] border border-white/10 bg-[#101011]"
      >

        {/* CLOSE */}

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/60 backdrop-blur-xl transition hover:bg-black/70 hover:text-white disabled:opacity-40"
        >

          <X size={15} />

        </button>


        {/* HEADER */}

        <div className="border-b border-white/[0.07] px-6 py-5">

          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">

              <WandSparkles size={16} />

            </div>


            <div>

              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">

                AI Virtual Try-On

              </p>

              <h2 className="mt-0.5 text-lg font-semibold">

                {style.name}

              </h2>

            </div>

          </div>

        </div>


        {/* IMAGES */}

        <div className="grid gap-px bg-white/[0.05] md:grid-cols-2">

          {/* YOUR PHOTO */}

          <div className="relative aspect-[4/5] overflow-hidden bg-black">

            {result ? (

              <img
                src={result}
                alt={`Your photo with ${style.name}`}
                className="h-full w-full object-contain"
              />

            ) : preview ? (

              <img
                src={preview}
                alt="Your uploaded photo"
                className="h-full w-full object-contain"
              />

            ) : (

              <div className="flex h-full items-center justify-center">

                <ImagePlus className="text-white/20" />

              </div>

            )}


            <div className="absolute bottom-4 left-4 rounded-full bg-black/65 px-3 py-1.5 text-[8px] uppercase tracking-wider text-white/65 backdrop-blur-xl">

              {result
                ? "AI RESULT"
                : "YOUR PHOTO"}

            </div>


            {loading && (

              <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm">

                <div className="text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">

                    <Loader2
                      size={22}
                      className="animate-spin text-white"
                    />

                  </div>


                  <p className="mt-4 text-sm font-medium">

                    Creating your look...

                  </p>


                  <p className="mt-1 text-[10px] text-white/35">

                    AI hairstyle transfer is running

                  </p>

                </div>

              </div>

            )}

          </div>


          {/* REFERENCE */}

          <div className="relative aspect-[4/5] overflow-hidden bg-black">

            <img
              src={referencePath}
              alt={`${style.name} reference`}
              className="h-full w-full object-contain"
              onError={() => {

                if (
                  extensionIndex <
                  extensions.length - 1
                ) {

                  setExtensionIndex(
                    extensionIndex + 1
                  );

                }

              }}
            />


            <div className="absolute bottom-4 left-4 rounded-full bg-black/65 px-3 py-1.5 text-[8px] uppercase tracking-wider text-white/65 backdrop-blur-xl">

              REFERENCE

            </div>

          </div>

        </div>


        {/* CONTROLS */}

        <div className="p-6">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-[9px] uppercase tracking-[0.2em] text-white/25">

                Selected hairstyle

              </p>


              <h3 className="mt-1 text-xl font-medium">

                {style.name}

              </h3>


              <p className="mt-1 text-xs text-white/30">

                {Math.round(style.match_score)}%
                {" "}
                match for your profile

              </p>

            </div>


            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

              <Link
                href={`/ar-try-on?style=${encodeURIComponent(style.id)}&name=${encodeURIComponent(style.name)}`}
                className="flex min-w-[190px] items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3.5 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <Camera size={15} />
                Try this style in AR
              </Link>

              <button
                type="button"
                onClick={onGenerate}
                disabled={
                  loading ||
                  !!result
                }
                className="flex min-w-[210px] items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-xs font-semibold text-black transition hover:scale-[1.02] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >

              {loading ? (

                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />

                  Generating...

                </>

              ) : result ? (

                <>
                  <Check size={15} />

                  Look generated

                </>

              ) : (

                <>
                  <WandSparkles
                    size={15}
                  />

                  Generate my look

                </>

              )}

              </button>

            </div>

          </div>


          {/* SUCCESS */}

          <AnimatePresence>

            {result && (

  <motion.div
    initial={{
      opacity: 0,
      y: 8,
    }}
    animate={{
      opacity: 1,
      y: 0,
    }}
    className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.05] px-4 py-4"
  >

    <div className="flex items-center gap-3">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/15 bg-emerald-400/10">

        <Check
          size={16}
          className="text-emerald-300"
        />

      </div>

      <div>

        <p className="text-xs font-medium text-emerald-200/90">
          Your look is ready
        </p>

        <p className="mt-0.5 text-[10px] text-emerald-200/45">
          AI hairstyle transformation completed.
        </p>

      </div>

    </div>


    <a
      href={result}
      download={`hairvision-${style.id}.png`}
      className="group flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-[10px] font-semibold text-black transition duration-300 hover:scale-[1.03] hover:bg-white/90"
    >

      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>

      Download image

    </a>

  </motion.div>

)}

          </AnimatePresence>

        </div>

      </motion.div>

    </motion.div>
  );
}


// ============================================================
// LOADING RECOMMENDATIONS
// ============================================================

function LoadingRecommendations() {

  return (

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

      {Array.from({
        length: 8,
      }).map((_, index) => (

        <motion.div
          key={index}
          animate={{
            opacity: [
              0.3,
              0.6,
              0.3,
            ],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: index * 0.08,
          }}
          className="h-[390px] rounded-2xl border border-white/[0.06] bg-white/[0.025]"
        />

      ))}

    </div>
  );
}


// ============================================================
// AMBIENT BACKGROUND
// ============================================================

function AmbientBackground() {

  return (

    <div className="pointer-events-none fixed inset-0 overflow-hidden">

      <motion.div
        animate={{
          scale: [
            1,
            1.08,
            1,
          ],
          opacity: [
            0.16,
            0.22,
            0.16,
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-1/2 top-[-350px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[150px]"
      />


      <motion.div
        animate={{
          x: [
            0,
            35,
            0,
          ],
          y: [
            0,
            -20,
            0,
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-300px] left-[-180px] h-[550px] w-[550px] rounded-full bg-fuchsia-500/10 blur-[150px]"
      />


      <motion.div
        animate={{
          x: [
            0,
            -30,
            0,
          ],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute right-[-200px] top-1/3 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[150px]"
      />


      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:70px_70px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />

    </div>
  );
}