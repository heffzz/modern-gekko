<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useIndicatorsStore } from '@/stores/indicators'
import type { Indicator, IndicatorConfig as IIndicatorConfig, IndicatorParameter } from '@/types'

interface Props {
  modelValue: Indicator[]
  availableIndicators?: string[]
  maxIndicators?: number
  allowCustomColors?: boolean
  showPreview?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxIndicators: 10,
  allowCustomColors: true,
  showPreview: true
})

const emit = defineEmits<{
  'update:modelValue': [indicators: Indicator[]]
  'preview': [indicator: Indicator]
  'add': [indicator: Indicator]
  'remove': [indicatorId: string]
  'update': [indicator: Indicator]
}>()

const indicatorsStore = useIndicatorsStore()

// Component state
const selectedIndicatorType = ref('')
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const editingIndicator = ref<Indicator | null>(null)
const previewIndicator = ref<Indicator | null>(null)
const isLoadingPreview = ref(false)

// Form state for new/edit indicator
const indicatorForm = ref<{
  name: string
  type: string
  parameters: Record<string, any>
  color: string
  overlay: boolean
  visible: boolean
}>({
  name: '',
  type: '',
  parameters: {},
  color: '#3b82f6',
  overlay: true,
  visible: true
})

// Computed properties
const availableIndicatorTypes = computed(() => {
  if (props.availableIndicators) {
    return props.availableIndicators
  }
  return indicatorsStore.availableIndicators.map(ind => ind.type)
})

const selectedIndicatorConfig = computed(() => {
  return indicatorsStore.getIndicatorConfig(selectedIndicatorType.value)
})

const canAddMoreIndicators = computed(() => {
  return props.modelValue.length < props.maxIndicators
})

const indicatorColors = computed(() => [
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#ef4444'  // Red
])

// Methods
const openAddDialog = () => {
  resetForm()
  showAddDialog.value = true
}

const openEditDialog = (indicator: Indicator) => {
  editingIndicator.value = indicator
  indicatorForm.value = {
    name: indicator.name,
    type: indicator.type,
    parameters: { ...indicator.parameters },
    color: indicator.color || '#3b82f6',
    overlay: indicator.overlay || false,
    visible: indicator.visible !== false
  }
  selectedIndicatorType.value = indicator.type
  showEditDialog.value = true
}

const resetForm = () => {
  indicatorForm.value = {
    name: '',
    type: '',
    parameters: {},
    color: '#3b82f6',
    overlay: true,
    visible: true
  }
  selectedIndicatorType.value = ''
  editingIndicator.value = null
  previewIndicator.value = null
}

const closeDialogs = () => {
  showAddDialog.value = false
  showEditDialog.value = false
  resetForm()
}

const generateIndicatorName = (type: string, parameters: Record<string, any>): string => {
  const config = indicatorsStore.getIndicatorConfig(type)
  if (!config) return type
  
  const paramStr = Object.entries(parameters)
    .filter(([key, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(',')
  
  return paramStr ? `${config.name}(${paramStr})` : config.name
}

const validateForm = (): boolean => {
  if (!selectedIndicatorType.value) {
    return false
  }
  
  const config = selectedIndicatorConfig.value
  if (!config) return false
  
  // Validate required parameters
  for (const param of config.parameters) {
    if (param.required && (indicatorForm.value.parameters[param.name] === null || indicatorForm.value.parameters[param.name] === undefined)) {
      return false
    }
  }
  
  return true
}

const addIndicator = async () => {
  if (!validateForm()) return
  
  const config = selectedIndicatorConfig.value!
  const newIndicator: Indicator = {
    id: `${selectedIndicatorType.value}_${Date.now()}`,
    name: indicatorForm.value.name || generateIndicatorName(selectedIndicatorType.value, indicatorForm.value.parameters),
    type: selectedIndicatorType.value,
    parameters: { ...indicatorForm.value.parameters },
    color: indicatorForm.value.color,
    overlay: indicatorForm.value.overlay,
    visible: indicatorForm.value.visible,
    values: []
  }
  
  const updatedIndicators = [...props.modelValue, newIndicator]
  emit('update:modelValue', updatedIndicators)
  emit('add', newIndicator)
  
  closeDialogs()
}

const updateIndicator = async () => {
  if (!validateForm() || !editingIndicator.value) return
  
  const updatedIndicator: Indicator = {
    ...editingIndicator.value,
    name: indicatorForm.value.name || generateIndicatorName(selectedIndicatorType.value, indicatorForm.value.parameters),
    parameters: { ...indicatorForm.value.parameters },
    color: indicatorForm.value.color,
    overlay: indicatorForm.value.overlay,
    visible: indicatorForm.value.visible
  }
  
  const updatedIndicators = props.modelValue.map(ind => 
    ind.id === updatedIndicator.id ? updatedIndicator : ind
  )
  
  emit('update:modelValue', updatedIndicators)
  emit('update', updatedIndicator)
  
  closeDialogs()
}

const removeIndicator = (indicatorId: string) => {
  const updatedIndicators = props.modelValue.filter(ind => ind.id !== indicatorId)
  emit('update:modelValue', updatedIndicators)
  emit('remove', indicatorId)
}

const toggleIndicatorVisibility = (indicatorId: string) => {
  const updatedIndicators = props.modelValue.map(ind => 
    ind.id === indicatorId ? { ...ind, visible: !ind.visible } : ind
  )
  emit('update:modelValue', updatedIndicators)
}

const duplicateIndicator = (indicator: Indicator) => {
  if (!canAddMoreIndicators.value) return
  
  const duplicated: Indicator = {
    ...indicator,
    id: `${indicator.type}_${Date.now()}`,
    name: `${indicator.name} (Copy)`,
    values: []
  }
  
  const updatedIndicators = [...props.modelValue, duplicated]
  emit('update:modelValue', updatedIndicators)
  emit('add', duplicated)
}

const previewIndicatorConfig = async () => {
  if (!validateForm() || !props.showPreview) return
  
  isLoadingPreview.value = true
  
  try {
    const preview: Indicator = {
      id: 'preview',
      name: indicatorForm.value.name || generateIndicatorName(selectedIndicatorType.value, indicatorForm.value.parameters),
      type: selectedIndicatorType.value,
      parameters: { ...indicatorForm.value.parameters },
      color: indicatorForm.value.color,
      overlay: indicatorForm.value.overlay,
      visible: true,
      values: []
    }
    
    previewIndicator.value = preview
    emit('preview', preview)
  } catch (error) {
    console.error('Failed to preview indicator:', error)
  } finally {
    isLoadingPreview.value = false
  }
}

const getParameterInputType = (param: IndicatorParameter): string => {
  switch (param.type) {
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'checkbox'
    case 'string':
      return 'text'
    case 'select':
      return 'select'
    default:
      return 'text'
  }
}

const getParameterStep = (param: IndicatorParameter): string | undefined => {
  if (param.type === 'integer') return '1'
  if (param.type === 'number') return '0.01'
  return undefined
}

// Watchers
watch(selectedIndicatorType, (newType) => {
  if (newType) {
    const config = indicatorsStore.getIndicatorConfig(newType)
    if (config) {
      // Initialize parameters with default values
      const defaultParams: Record<string, any> = {}
      config.parameters.forEach(param => {
        if (param.default !== undefined) {
          defaultParams[param.name] = param.default
        }
      })
      indicatorForm.value.parameters = defaultParams
      indicatorForm.value.overlay = config.overlay || false
      
      // Auto-generate name if not editing
      if (!editingIndicator.value) {
        indicatorForm.value.name = generateIndicatorName(newType, defaultParams)
      }
    }
  }
})

watch(() => indicatorForm.value.parameters, () => {
  if (selectedIndicatorType.value && !editingIndicator.value) {
    indicatorForm.value.name = generateIndicatorName(selectedIndicatorType.value, indicatorForm.value.parameters)
  }
}, { deep: true })
</script>

<template>
  <div class="indicator-config">
    <!-- Header -->
    <div class="config-header">
      <h3 class="config-title">Indicators</h3>
      <button 
        @click="openAddDialog"
        :disabled="!canAddMoreIndicators"
        class="add-button"
        :title="canAddMoreIndicators ? 'Add Indicator' : `Maximum ${maxIndicators} indicators allowed`"
      >
        <span class="add-icon">+</span>
        Add Indicator
      </button>
    </div>
    
    <!-- Indicators List -->
    <div class="indicators-list">
      <div 
        v-for="indicator in modelValue" 
        :key="indicator.id"
        class="indicator-item"
        :class="{ 'invisible': !indicator.visible }"
      >
        <div class="indicator-info">
          <div 
            class="indicator-color"
            :style="{ backgroundColor: indicator.color }"
          ></div>
          <div class="indicator-details">
            <span class="indicator-name">{{ indicator.name }}</span>
            <span class="indicator-type">{{ indicator.type }}</span>
          </div>
        </div>
        
        <div class="indicator-actions">
          <button 
            @click="toggleIndicatorVisibility(indicator.id)"
            class="action-button"
            :title="indicator.visible ? 'Hide' : 'Show'"
          >
            {{ indicator.visible ? '👁️' : '👁️‍🗨️' }}
          </button>
          <button 
            @click="openEditDialog(indicator)"
            class="action-button"
            title="Edit"
          >
            ✏️
          </button>
          <button 
            @click="duplicateIndicator(indicator)"
            :disabled="!canAddMoreIndicators"
            class="action-button"
            title="Duplicate"
          >
            📋
          </button>
          <button 
            @click="removeIndicator(indicator.id)"
            class="action-button danger"
            title="Remove"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div v-if="modelValue.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <p class="empty-text">No indicators added yet</p>
        <button @click="openAddDialog" class="empty-action">Add your first indicator</button>
      </div>
    </div>
    
    <!-- Add Indicator Dialog -->
    <div v-if="showAddDialog" class="dialog-overlay" @click="closeDialogs">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h4 class="dialog-title">Add Indicator</h4>
          <button @click="closeDialogs" class="close-button">×</button>
        </div>
        
        <div class="dialog-content">
          <!-- Indicator Type Selection -->
          <div class="form-group">
            <label class="form-label">Indicator Type</label>
            <select v-model="selectedIndicatorType" class="form-select">
              <option value="">Select an indicator...</option>
              <option 
                v-for="type in availableIndicatorTypes" 
                :key="type" 
                :value="type"
              >
                {{ indicatorsStore.getIndicatorConfig(type)?.name || type }}
              </option>
            </select>
          </div>
          
          <!-- Indicator Configuration -->
          <template v-if="selectedIndicatorConfig">
            <!-- Name -->
            <div class="form-group">
              <label class="form-label">Name</label>
              <input 
                v-model="indicatorForm.name"
                type="text"
                class="form-input"
                :placeholder="generateIndicatorName(selectedIndicatorType, indicatorForm.parameters)"
              />
            </div>
            
            <!-- Parameters -->
            <div v-if="selectedIndicatorConfig.parameters.length > 0" class="parameters-section">
              <h5 class="parameters-title">Parameters</h5>
              <div 
                v-for="param in selectedIndicatorConfig.parameters" 
                :key="param.name"
                class="form-group"
              >
                <label class="form-label">
                  {{ param.label || param.name }}
                  <span v-if="param.required" class="required">*</span>
                </label>
                
                <!-- Number/Integer Input -->
                <input 
                  v-if="param.type === 'number' || param.type === 'integer'"
                  v-model.number="indicatorForm.parameters[param.name]"
                  :type="getParameterInputType(param)"
                  :step="getParameterStep(param)"
                  :min="param.min"
                  :max="param.max"
                  class="form-input"
                  :placeholder="param.default?.toString()"
                />
                
                <!-- Boolean Input -->
                <label v-else-if="param.type === 'boolean'" class="checkbox-label">
                  <input 
                    v-model="indicatorForm.parameters[param.name]"
                    type="checkbox"
                    class="form-checkbox"
                  />
                  <span class="checkbox-text">{{ param.description || 'Enable' }}</span>
                </label>
                
                <!-- Select Input -->
                <select 
                  v-else-if="param.type === 'select'"
                  v-model="indicatorForm.parameters[param.name]"
                  class="form-select"
                >
                  <option 
                    v-for="option in param.options" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                
                <!-- String Input -->
                <input 
                  v-else
                  v-model="indicatorForm.parameters[param.name]"
                  type="text"
                  class="form-input"
                  :placeholder="param.default?.toString()"
                />
                
                <p v-if="param.description" class="param-description">
                  {{ param.description }}
                </p>
              </div>
            </div>
            
            <!-- Appearance -->
            <div class="appearance-section">
              <h5 class="section-title">Appearance</h5>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Color</label>
                  <div class="color-picker">
                    <input 
                      v-model="indicatorForm.color"
                      type="color"
                      class="color-input"
                    />
                    <div class="color-presets">
                      <button 
                        v-for="color in indicatorColors"
                        :key="color"
                        @click="indicatorForm.color = color"
                        class="color-preset"
                        :style="{ backgroundColor: color }"
                        :class="{ active: indicatorForm.color === color }"
                      ></button>
                    </div>
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="checkbox-label">
                    <input 
                      v-model="indicatorForm.overlay"
                      type="checkbox"
                      class="form-checkbox"
                    />
                    <span class="checkbox-text">Overlay on price chart</span>
                  </label>
                </div>
              </div>
            </div>
            
            <!-- Preview -->
            <div v-if="showPreview" class="preview-section">
              <button 
                @click="previewIndicatorConfig"
                :disabled="!validateForm() || isLoadingPreview"
                class="preview-button"
              >
                <span v-if="isLoadingPreview" class="loading-spinner"></span>
                {{ isLoadingPreview ? 'Loading...' : 'Preview' }}
              </button>
            </div>
          </template>
        </div>
        
        <div class="dialog-footer">
          <button @click="closeDialogs" class="cancel-button">Cancel</button>
          <button 
            @click="addIndicator"
            :disabled="!validateForm()"
            class="confirm-button"
          >
            Add Indicator
          </button>
        </div>
      </div>
    </div>
    
    <!-- Edit Indicator Dialog -->
    <div v-if="showEditDialog" class="dialog-overlay" @click="closeDialogs">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h4 class="dialog-title">Edit Indicator</h4>
          <button @click="closeDialogs" class="close-button">×</button>
        </div>
        
        <div class="dialog-content">
          <!-- Same content as Add Dialog but with update button -->
          <template v-if="selectedIndicatorConfig">
            <!-- Name -->
            <div class="form-group">
              <label class="form-label">Name</label>
              <input 
                v-model="indicatorForm.name"
                type="text"
                class="form-input"
                :placeholder="generateIndicatorName(selectedIndicatorType, indicatorForm.parameters)"
              />
            </div>
            
            <!-- Parameters (same as add dialog) -->
            <div v-if="selectedIndicatorConfig.parameters.length > 0" class="parameters-section">
              <h5 class="parameters-title">Parameters</h5>
              <div 
                v-for="param in selectedIndicatorConfig.parameters" 
                :key="param.name"
                class="form-group"
              >
                <label class="form-label">
                  {{ param.label || param.name }}
                  <span v-if="param.required" class="required">*</span>
                </label>
                
                <!-- Same parameter inputs as add dialog -->
                <input 
                  v-if="param.type === 'number' || param.type === 'integer'"
                  v-model.number="indicatorForm.parameters[param.name]"
                  :type="getParameterInputType(param)"
                  :step="getParameterStep(param)"
                  :min="param.min"
                  :max="param.max"
                  class="form-input"
                />
                
                <label v-else-if="param.type === 'boolean'" class="checkbox-label">
                  <input 
                    v-model="indicatorForm.parameters[param.name]"
                    type="checkbox"
                    class="form-checkbox"
                  />
                  <span class="checkbox-text">{{ param.description || 'Enable' }}</span>
                </label>
                
                <select 
                  v-else-if="param.type === 'select'"
                  v-model="indicatorForm.parameters[param.name]"
                  class="form-select"
                >
                  <option 
                    v-for="option in param.options" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                
                <input 
                  v-else
                  v-model="indicatorForm.parameters[param.name]"
                  type="text"
                  class="form-input"
                />
                
                <p v-if="param.description" class="param-description">
                  {{ param.description }}
                </p>
              </div>
            </div>
            
            <!-- Appearance (same as add dialog) -->
            <div class="appearance-section">
              <h5 class="section-title">Appearance</h5>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Color</label>
                  <div class="color-picker">
                    <input 
                      v-model="indicatorForm.color"
                      type="color"
                      class="color-input"
                    />
                    <div class="color-presets">
                      <button 
                        v-for="color in indicatorColors"
                        :key="color"
                        @click="indicatorForm.color = color"
                        class="color-preset"
                        :style="{ backgroundColor: color }"
                        :class="{ active: indicatorForm.color === color }"
                      ></button>
                    </div>
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="checkbox-label">
                    <input 
                      v-model="indicatorForm.overlay"
                      type="checkbox"
                      class="form-checkbox"
                    />
                    <span class="checkbox-text">Overlay on price chart</span>
                  </label>
                </div>
              </div>
            </div>
          </template>
        </div>
        
        <div class="dialog-footer">
          <button @click="closeDialogs" class="cancel-button">Cancel</button>
          <button 
            @click="updateIndicator"
            :disabled="!validateForm()"
            class="confirm-button"
          >
            Update Indicator
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.indicator-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Header */
.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.add-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.add-icon {
  font-size: 1rem;
  font-weight: bold;
}

/* Indicators List */
.indicators-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.indicator-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.indicator-item:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.indicator-item.invisible {
  opacity: 0.5;
}

.indicator-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.indicator-color {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 1px #e2e8f0;
}

.indicator-details {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.indicator-name {
  font-weight: 500;
  color: #1e293b;
  font-size: 0.875rem;
}

.indicator-type {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.indicator-actions {
  display: flex;
  gap: 0.25rem;
}

.action-button {
  padding: 0.375rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
}

.action-button:hover:not(:disabled) {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button.danger:hover:not(:disabled) {
  background-color: #fef2f2;
  border-color: #fca5a5;
  color: #dc2626;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-text {
  color: #64748b;
  margin-bottom: 1rem;
}

.empty-action {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.empty-action:hover {
  background-color: #2563eb;
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.dialog {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 32rem;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-button {
  padding: 0.25rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

/* Form Elements */
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.required {
  color: #dc2626;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.form-checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: #3b82f6;
}

.checkbox-text {
  font-size: 0.875rem;
  color: #374151;
}

.param-description {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
  margin-bottom: 0;
}

/* Sections */
.parameters-section,
.appearance-section,
.preview-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.parameters-title,
.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* Color Picker */
.color-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-input {
  width: 3rem;
  height: 2rem;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
}

.color-presets {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.color-preset {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-preset:hover {
  transform: scale(1.1);
}

.color-preset.active {
  border-color: #1e293b;
  box-shadow: 0 0 0 2px white, 0 0 0 4px #1e293b;
}

/* Buttons */
.cancel-button,
.confirm-button,
.preview-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button {
  background-color: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.cancel-button:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.confirm-button {
  background-color: #3b82f6;
  color: white;
}

.confirm-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.confirm-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.preview-button {
  background-color: #f59e0b;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-button:hover:not(:disabled) {
  background-color: #d97706;
}

.preview-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .config-title {
    color: #f1f5f9;
  }
  
  .indicator-item {
    background-color: #1e293b;
    border-color: #334155;
  }
  
  .indicator-item:hover {
    background-color: #334155;
    border-color: #475569;
  }
  
  .indicator-name {
    color: #f1f5f9;
  }
  
  .indicator-type {
    color: #94a3b8;
  }
  
  .action-button {
    background-color: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }
  
  .action-button:hover:not(:disabled) {
    background-color: #4b5563;
    border-color: #6b7280;
  }
  
  .dialog {
    background-color: #1e293b;
  }
  
  .dialog-header,
  .dialog-footer {
    border-color: #334155;
  }
  
  .dialog-title {
    color: #f1f5f9;
  }
  
  .close-button {
    color: #94a3b8;
  }
  
  .close-button:hover {
    background-color: #334155;
    color: #f1f5f9;
  }
  
  .form-label {
    color: #e5e7eb;
  }
  
  .form-input,
  .form-select {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .form-input:focus,
  .form-select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .checkbox-text {
    color: #e5e7eb;
  }
  
  .param-description {
    color: #94a3b8;
  }
  
  .parameters-title,
  .section-title {
    color: #f1f5f9;
  }
  
  .parameters-section,
  .appearance-section,
  .preview-section {
    border-color: #334155;
  }
  
  .color-input {
    background-color: #374151;
    border-color: #4b5563;
  }
  
  .cancel-button {
    background-color: #374151;
    color: #94a3b8;
    border-color: #4b5563;
  }
  
  .cancel-button:hover {
    background-color: #4b5563;
    border-color: #6b7280;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .config-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .dialog {
    margin: 0.5rem;
    max-height: calc(100vh - 1rem);
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .indicator-item {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  
  .indicator-info {
    justify-content: center;
  }
  
  .indicator-actions {
    justify-content: center;
  }
}
</style>