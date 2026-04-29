import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ProgramStage } from "../types/program.types";
import { StageSortableItem } from "./StageSortableItem";
import { StageCard } from "./StageCard";
import { StageEmptyState } from "./StageEmptyState";

interface StageListProps {
  stages: ProgramStage[];
  onReorder: (newOrderedIds: string[]) => void;
  onEdit: (stage: ProgramStage) => void;
  onDelete: (stage: ProgramStage) => void;
  onAnalyze?: (stage: ProgramStage) => void;
  onAddClick: () => void;
  isAdmin: boolean;
  isAdminOrFaculty: boolean;
}

export function StageList({
  stages,
  onReorder,
  onEdit,
  onDelete,
  onAnalyze,
  onAddClick,
  isAdmin,
  isAdminOrFaculty
}: StageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex((item) => item.id === active.id);
      const newIndex = stages.findIndex((item) => item.id === over.id);

      const newOrderedStages = arrayMove(stages, oldIndex, newIndex);
      onReorder(newOrderedStages.map((s) => s.id));
    }
  }

  if (stages.length === 0) {
    return <StageEmptyState onAddClick={onAddClick} isAdminOrFaculty={isAdminOrFaculty} />;
  }

  return (
    <div className="space-y-3">
      {isAdminOrFaculty ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stages.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {stages.map((stage) => (
                <StageSortableItem
                  key={stage.id}
                  stage={stage}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAnalyze={onAnalyze}
                  isAdmin={isAdmin}
                  isAdminOrFaculty={isAdminOrFaculty}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-3">
          {stages.map((stage) => (
            <StageCard
              key={stage.id}
              stage={stage}
              onEdit={onEdit}
              onDelete={onDelete}
              onAnalyze={onAnalyze}
              isAdmin={isAdmin}
              isAdminOrFaculty={isAdminOrFaculty}
            />
          ))}
        </div>
      )}
    </div>
  );
}
