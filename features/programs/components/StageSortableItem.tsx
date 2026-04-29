import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StageCard } from "./StageCard";
import { ProgramStage } from "../types/program.types";

interface StageSortableItemProps {
  stage: ProgramStage;
  onEdit: (stage: ProgramStage) => void;
  onDelete: (stage: ProgramStage) => void;
  onAnalyze?: (stage: ProgramStage) => void;
  isAdmin: boolean;
  isAdminOrFaculty: boolean;
}

export function StageSortableItem({
  stage,
  onEdit,
  onDelete,
  onAnalyze,
  isAdmin,
  isAdminOrFaculty
}: StageSortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="outline-none">
      <StageCard
        stage={stage}
        onEdit={onEdit}
        onDelete={onDelete}
        onAnalyze={onAnalyze}
        isAdmin={isAdmin}
        isAdminOrFaculty={isAdminOrFaculty}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
