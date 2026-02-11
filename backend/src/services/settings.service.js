const prisma = require('../config/database');
const AppError = require('../utils/AppError');

// Default settings with their types
const DEFAULT_SETTINGS = {
  // Business Info
  business_name: { value: 'Salon ERP', type: 'string', public: true },
  business_tagline: { value: 'Your Beauty Partner', type: 'string', public: true },
  business_logo_url: { value: null, type: 'string', public: true },
  business_email: { value: null, type: 'string', public: true },
  business_phone: { value: null, type: 'string', public: true },
  business_address: { value: null, type: 'string', public: true },
  business_website: { value: null, type: 'string', public: true },

  // Tax & Legal
  gst_number: { value: null, type: 'string', public: false },
  pan_number: { value: null, type: 'string', public: false },
  gst_rate: { value: '18', type: 'number', public: true },

  // Bill Settings
  bill_prefix: { value: 'BILL', type: 'string', public: true },
  bill_footer_text: { value: 'Thank you for visiting!', type: 'string', public: true },
  bill_terms: { value: null, type: 'string', public: true },
  auto_print_bill: { value: 'false', type: 'boolean', public: true },

  // Operational Settings
  default_currency: { value: 'INR', type: 'string', public: true },
  currency_symbol: { value: '₹', type: 'string', public: true },
  date_format: { value: 'DD/MM/YYYY', type: 'string', public: true },
  time_format: { value: '12h', type: 'string', public: true },
  timezone: { value: 'Asia/Kolkata', type: 'string', public: true },

  // Notification Settings
  sms_enabled: { value: 'false', type: 'boolean', public: false },
  email_notifications: { value: 'true', type: 'boolean', public: false },
  low_stock_threshold: { value: '10', type: 'number', public: false },

  // Employee Settings
  star_points_enabled: { value: 'true', type: 'boolean', public: true },
  default_monthly_star_goal: { value: '100', type: 'number', public: true },
  working_hours_start: { value: '09:00', type: 'string', public: true },
  working_hours_end: { value: '21:00', type: 'string', public: true },
};

class SettingsService {
  /**
   * Get all settings
   */
  async getSettings(publicOnly = false) {
    const settings = await prisma.systemSetting.findMany({
      where: publicOnly ? { isPublic: true } : {},
      orderBy: { settingKey: 'asc' },
    });

    // Convert to key-value object
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.settingKey] = {
        value: this.parseValue(s.settingValue, s.settingType),
        type: s.settingType,
        description: s.description,
      };
    });

    // Merge with defaults
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      if (!settingsMap[key]) {
        if (!publicOnly || DEFAULT_SETTINGS[key].public) {
          settingsMap[key] = {
            value: this.parseValue(DEFAULT_SETTINGS[key].value, DEFAULT_SETTINGS[key].type),
            type: DEFAULT_SETTINGS[key].type,
          };
        }
      }
    });

    return settingsMap;
  }

  /**
   * Get a single setting by key
   */
  async getSetting(key) {
    const setting = await prisma.systemSetting.findUnique({
      where: { settingKey: key },
    });

    if (setting) {
      return {
        key: setting.settingKey,
        value: this.parseValue(setting.settingValue, setting.settingType),
        type: setting.settingType,
        description: setting.description,
      };
    }

    // Return default if exists
    if (DEFAULT_SETTINGS[key]) {
      return {
        key,
        value: this.parseValue(DEFAULT_SETTINGS[key].value, DEFAULT_SETTINGS[key].type),
        type: DEFAULT_SETTINGS[key].type,
      };
    }

    return null;
  }

  /**
   * Update settings (bulk update)
   */
  async updateSettings(settingsData, userId) {
    const updates = [];

    for (const [key, value] of Object.entries(settingsData)) {
      const defaultSetting = DEFAULT_SETTINGS[key];
      const settingType = defaultSetting?.type || 'string';
      const isPublic = defaultSetting?.public ?? false;

      updates.push(
        prisma.systemSetting.upsert({
          where: { settingKey: key },
          create: {
            settingKey: key,
            settingValue: String(value),
            settingType,
            isPublic,
            updatedById: userId,
          },
          update: {
            settingValue: String(value),
            updatedById: userId,
          },
        })
      );
    }

    await prisma.$transaction(updates);

    return this.getSettings();
  }

  /**
   * Update a single setting
   */
  async updateSetting(key, value, userId) {
    const defaultSetting = DEFAULT_SETTINGS[key];
    const settingType = defaultSetting?.type || 'string';
    const isPublic = defaultSetting?.public ?? false;

    const setting = await prisma.systemSetting.upsert({
      where: { settingKey: key },
      create: {
        settingKey: key,
        settingValue: String(value),
        settingType,
        isPublic,
        updatedById: userId,
      },
      update: {
        settingValue: String(value),
        updatedById: userId,
      },
    });

    return {
      key: setting.settingKey,
      value: this.parseValue(setting.settingValue, setting.settingType),
      type: setting.settingType,
    };
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(userId) {
    await prisma.systemSetting.deleteMany({});
    return this.getSettings();
  }

  /**
   * Get branch features
   */
  async getBranchFeatures(branchId) {
    const features = await prisma.branchFeature.findMany({
      where: { branchId },
      include: {
        feature: true,
      },
    });

    return features.map(bf => ({
      feature_id: bf.featureId,
      feature_name: bf.feature.featureName,
      feature_key: bf.feature.featureKey,
      is_enabled: bf.isEnabled,
    }));
  }

  /**
   * Update branch feature
   */
  async updateBranchFeature(branchId, featureId, isEnabled) {
    const feature = await prisma.branchFeature.upsert({
      where: {
        branchId_featureId: { branchId, featureId },
      },
      create: {
        branchId,
        featureId,
        isEnabled,
      },
      update: {
        isEnabled,
      },
      include: {
        feature: true,
      },
    });

    return {
      feature_id: feature.featureId,
      feature_name: feature.feature.featureName,
      is_enabled: feature.isEnabled,
    };
  }

  /**
   * Parse value based on type
   */
  parseValue(value, type) {
    if (value === null || value === undefined) return null;

    switch (type) {
      case 'number':
        return parseFloat(value) || 0;
      case 'boolean':
        return value === 'true' || value === true;
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }
}

module.exports = new SettingsService();
