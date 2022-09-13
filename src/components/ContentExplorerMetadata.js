
import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import axios from 'axios';
import { ContentExplorer } from 'box-ui-elements';
import { ScaleLoader } from 'react-spinners';
import { THEME_COLOR, EXPRESS_SERVER_HOST } from '../Constants';


export default ({  match, location, history }) => {
    const [token, setToken] = useState(null);
    const [rootFolderId, setRootFolderId] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const boxEnterpriseId = new URLSearchParams(location.search).get('boxEnterpriseId').trim();
    const boxMdTemplateKey = new URLSearchParams(location.search).get('boxMdTemplateKey').trim();
    const boxMdQueryFieldKey = new URLSearchParams(location.search).get('boxMdQueryFieldKey').trim();
    const boxMdQueryOperator = new URLSearchParams(location.search).get('boxMdQueryOperator').trim();
    const salesforceField = new URLSearchParams(location.search).get('salesforceField').trim();
    const boxMdColumnFieldKeys = new URLSearchParams(location.search).get('boxMdColumnFieldKeys').trim();

    const eidAndMDTemplate = `enterprise_${boxEnterpriseId}.${boxMdTemplateKey}`;

    const fields = [];
    const fieldsToShow = [{ key: boxMdQueryFieldKey, displayName: _.startCase(boxMdQueryFieldKey), canEdit: true}];
    const fieldKeys = boxMdColumnFieldKeys.split(',');
    fieldKeys.forEach((fieldKey, index) => {
        const fieldDisplayName = _.startCase(fieldKey);
        const mdField = `${eidAndMDTemplate}.${fieldKey}`;
        fields.push(mdField);
        fieldsToShow.push({ key: mdField, displayName: fieldDisplayName, canEdit: true} );
    });

    
    const mdQuery = {
        from: eidAndMDTemplate,
        fields: fields,
        ancestor_folder_id: '0',
        order_by:  [
            {
              field_key: boxMdQueryFieldKey,
              direction: "asc"
            }
          ]
    };

    if(typeof salesforceField !== 'undefined' && salesforceField !== 'undefined' && salesforceField) {
        mdQuery['query'] = `${boxMdQueryFieldKey} ${boxMdQueryOperator} :value`;       
        mdQuery['query_params'] = { value: salesforceField};
    } else {
        mdQuery['query'] = `${boxMdQueryFieldKey} ${boxMdQueryOperator}`;       
    }
    
   

    console.log('Using metadata query: ', JSON.stringify(mdQuery));

    const defaultView = "metadata";
    useEffect(() => {
        const fetchToken = async () => {
            setIsLoading(true);
            const result = await axios.get(`${EXPRESS_SERVER_HOST}/box/metadata/token-downscope`);            

            setToken(result.data.accessToken);
            setIsLoading(false);
        }
        fetchToken();
    }, []);
    if(token) {
        console.log('Loading UI Element...');

        return (
            <div className="elements">
            <ContentExplorer
                language="en-US"
                token={token}
                metadataQuery={mdQuery}
                fieldsToShow={fieldsToShow}
                defaultView={defaultView}
                canShare={true}
            />
            </div>
        );
    }
    else {
        return(
                <div className="elements">
                    <div className="spinner">
                        <ScaleLoader 
                            color={THEME_COLOR}
                            loading={isLoading}
                        />
                    </div>                
                </div>
        );
    }
};
