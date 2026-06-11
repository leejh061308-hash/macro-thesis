import { AI_DISCLAIMER } from "@/lib/constants";

interface AiDisclaimerProps {
  className?: string;
}

export default function AiDisclaimer({ className = "" }: AiDisclaimerProps) {
  return (
    <p className={`text-[10px] leading-relaxed text-gray-500 ${className}`}>
      {AI_DISCLAIMER}
    </p>
  );
}
