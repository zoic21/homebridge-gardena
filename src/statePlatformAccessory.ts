import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { GardenaHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class StatePlatformAccessory {
  private service: Service;
  private device;
  private state;

  constructor(
    private readonly platform: GardenaHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'homebridge-gardena')
      .setCharacteristic(this.platform.Characteristic.Model, 'switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'state');
    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.handleOnSet.bind(this));
    this.device = accessory.context.device
  }

  updateValue(value){
    this.state = value;
    if(this.service.getCharacteristic(this.platform.Characteristic.On).value != value){
      this.platform.log.debug('Update switch value to :', value);
      this.service.updateCharacteristic(this.platform.Characteristic.On, value);
    }
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  handleOnSet(value) {
    if(value){
      this.platform.log.debug('Triggered state to auto');

      this.device.resumeSchedule().then(() => {
          this.platform.refreshData()
      }).catch(error => {
        setTimeout(() => {
          this.device.resumeSchedule().then(() => {
            this.platform.refreshData()
          })
        }, 1000);
      });
    }else{
      this.platform.log.debug('Triggered state to park');
      this.device.parkUntilFurtherNotice().then(() => {
        this.platform.refreshData()
      }).catch(error => {
        setTimeout(() => {
          this.device.parkUntilFurtherNotice().then(() => {
            this.platform.refreshData()
          })
        }, 1000);
      });
    }
  }

}
