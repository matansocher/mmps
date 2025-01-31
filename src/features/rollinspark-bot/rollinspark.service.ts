import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { ExpectedAptDetails } from './interfaces';

@Injectable()
export class RollinsparkService {
  async getAptsDetails(planId: number): Promise<ExpectedAptDetails[]> {
    const ajaxNonce = await this.getAjaxNonce();
    if (!ajaxNonce) {
      throw new Error('could not get nonce');
    }
    const url = 'https://www.rollinspark.net/wp-admin/admin-ajax.php';
    const body = {
      action: 'pcyfp_fetch_apt_availability',
      _ajax_nonce: ajaxNonce,
      planid: planId,
    };
    const result = await axios.post(url, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return result.data;
  }

  async getAjaxNonce() {
    const url = 'https://www.rollinspark.net/floor-plans/';
    const result = await axios.get(url);
    const [, nonce] = result.data.match(/"nonce":"(.*?)"/);
    return nonce || null;
  }
}
