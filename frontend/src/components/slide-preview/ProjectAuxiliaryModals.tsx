import { MaterialSelector, ProjectSettingsModal } from '@/components/shared';
import { MaterialGeneratorModal } from '@/components/shared/MaterialGeneratorModal';
import type { ExportExtractorMethod, ExportInpaintMethod } from '@/types';

type Props = {
  projectId: string;
  isMaterialModalOpen: boolean;
  isMaterialSelectorOpen: boolean;
  isProjectSettingsOpen: boolean;
  extraRequirements: string;
  templateStyle: string;
  exportExtractorMethod: ExportExtractorMethod;
  exportInpaintMethod: ExportInpaintMethod;
  isSavingRequirements: boolean;
  isSavingTemplateStyle: boolean;
  isSavingExportSettings: boolean;
  onCloseMaterialModal: () => void;
  onCloseMaterialSelector: () => void;
  onCloseProjectSettings: () => void;
  onSelectMaterials: (...args: any[]) => void;
  onExtraRequirementsChange: (value: string) => void;
  onTemplateStyleChange: (value: string) => void;
  onSaveExtraRequirements: () => Promise<void> | void;
  onSaveTemplateStyle: () => Promise<void> | void;
  onExportExtractorMethodChange: (value: ExportExtractorMethod) => void;
  onExportInpaintMethodChange: (value: ExportInpaintMethod) => void;
  onSaveExportSettings: () => Promise<void> | void;
};

export function ProjectAuxiliaryModals({
  projectId,
  isMaterialModalOpen,
  isMaterialSelectorOpen,
  isProjectSettingsOpen,
  extraRequirements,
  templateStyle,
  exportExtractorMethod,
  exportInpaintMethod,
  isSavingRequirements,
  isSavingTemplateStyle,
  isSavingExportSettings,
  onCloseMaterialModal,
  onCloseMaterialSelector,
  onCloseProjectSettings,
  onSelectMaterials,
  onExtraRequirementsChange,
  onTemplateStyleChange,
  onSaveExtraRequirements,
  onSaveTemplateStyle,
  onExportExtractorMethodChange,
  onExportInpaintMethodChange,
  onSaveExportSettings,
}: Props) {
  return (
    <>
      <MaterialGeneratorModal
        projectId={projectId}
        isOpen={isMaterialModalOpen}
        onClose={onCloseMaterialModal}
      />
      <MaterialSelector
        projectId={projectId}
        isOpen={isMaterialSelectorOpen}
        onClose={onCloseMaterialSelector}
        onSelect={onSelectMaterials}
        multiple={true}
      />
      <ProjectSettingsModal
        isOpen={isProjectSettingsOpen}
        onClose={onCloseProjectSettings}
        extraRequirements={extraRequirements}
        templateStyle={templateStyle}
        onExtraRequirementsChange={onExtraRequirementsChange}
        onTemplateStyleChange={onTemplateStyleChange}
        onSaveExtraRequirements={onSaveExtraRequirements}
        onSaveTemplateStyle={onSaveTemplateStyle}
        isSavingRequirements={isSavingRequirements}
        isSavingTemplateStyle={isSavingTemplateStyle}
        exportExtractorMethod={exportExtractorMethod}
        exportInpaintMethod={exportInpaintMethod}
        onExportExtractorMethodChange={onExportExtractorMethodChange}
        onExportInpaintMethodChange={onExportInpaintMethodChange}
        onSaveExportSettings={onSaveExportSettings}
        isSavingExportSettings={isSavingExportSettings}
      />
    </>
  );
}
