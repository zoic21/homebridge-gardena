import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { PresencePlatformAccessory } from './presencePlatformAccessory';
import { Tado } from "node-tado-client";


/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class TadoHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public Tado;
  public Devices = {};

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.info('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.info('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  refreshData(){
    this.Tado.getMe().then((resp) => {
      for (const home of resp.homes) {
        this.Tado.getState(home.id).then((state) => {
          const uuid = this.api.hap.uuid.generate('presence'+home.id);
          if(state.presence == 'AWAY'){
            this.Devices[uuid].updateValue(false);
          }else{
            this.Devices[uuid].updateValue(true);
          }
        });
        this.Tado.getDevices(home.id).then((state) => {

        });  
        this.Tado.getZones(home.id).then((state) => {

        });
        this.Tado.getHome(home.id).then((state) => {

        }); 
      }
    });
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    this.Tado = new Tado();
    // Login to the Tado Web API
    this.Tado.login(this.config.username, this.config.password).then(() => {
      this.Tado.getMe().then((resp) => {
        for (const home of resp.homes) {
          // generate a unique id for the accessory this should be generated from
          // something globally unique, but constant, for example, the device serial
          // number or MAC address
          const uuid = this.api.hap.uuid.generate('presence'+home.id);
    
          // see if an accessory with the same uuid has already been registered and restored from
          // the cached devices we stored in the `configureAccessory` method above
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    
          if (existingAccessory) {
            // the accessory already exists
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            this.Devices[uuid] = new PresencePlatformAccessory(this, existingAccessory);
          } else {
            // the accessory does not yet exist, so we need to create it
            this.log.info('Adding new accessory: Thermostat ', home.name);
    
            // create a new accessory
            const accessory = new this.api.platformAccessory('Thermostat '+home.name, uuid);
    
            // store a copy of the device object in the `accessory.context`
            // the `context` property can be used to store any data about the accessory you may need
            accessory.context.device = home;
    
            // create the accessory handler for the newly create accessory
            // this is imported from `platformAccessory.ts`
            this.Devices[uuid] = new PresencePlatformAccessory(this, accessory);
    
            // link the accessory to your platform
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }
      });
      this.refreshData();
      const self = this;
      setInterval(function(){
        self.refreshData();
      }, 10*60*1000);
    });
  }
}
