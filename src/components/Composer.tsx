import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Film, ImagePlus, Sparkles, X } from "lucide-react";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, aiSlides, uploadImage, uploadVideo, type Short } from "../lib/api";
import { toNew } from "../lib/alphabet";
import { canPlayVideo, inspectMp4 } from "../lib/video";
import { SlideEditor } from "./SlideEditor";
import { blankSlide, hasContent, mapText, slidesFromPlan, slidesText, type Slide } from "../lib/slides";
import { useApp, type ComposerState } from "../store";

const TONES: Array<[Short["tone"], string]> = [["sand", "Indigo"], ["sage", "Firuza"], ["ink", "Tun"], ["clay", "Tong"]];
const mb = (n: number) => (n / 1024 / 1024).toFixed(1);

/**
 * Admin uchun yozish oynasi: yangi fikr/short joylash yoki mavjudini tahrirlash, short uchun video yuklash.
 * Matn eski alifboda yozilsa, yangisiga (kanonik) avtomatik o‘giriladi. Tahrirlashda matn allaqachon yangi alifboda.
 */
export function Composer({ state, onClose }: { state: Exclude<ComposerState, null>; onClose: () => void }) {
  const { publish, u, c } = useApp();
  const edit = state.mode === "edit" ? state : null;
  const [kind, setKind] = useState<"thought" | "short">(edit?.kind ?? "thought");
  const [topic, setTopic] = useState(edit?.category ?? "");
  const [tone, setTone] = useState<Short["tone"]>(edit?.kind === "short" ? edit.tone : "sand");
  const [title, setTitle] = useState(edit?.kind === "thought" ? edit.title : "");
  const [body, setBody] = useState(edit ? (edit.kind === "thought" ? edit.body : edit.quote) : "");
  const [slides, setSlides] = useState<Slide[]>(edit?.kind === "short" && edit.slides?.length ? edit.slides : [blankSlide()]);
  const [classic, setClassic] = useState(edit?.kind === "short" && !edit.slides?.length);
  const
