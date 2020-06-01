# GTM Flow Chart Generator v0.0.1

This library provides a mechanism for visually representing Google Tag Manager
(GTM) containers as a flow chart, or more accurately a state diagram. This can
be very helpful for more complex GTM containers.

## Usage

1. If you don't have it already on your system, please install nodejs v8+.
2. Install the gtm-flow package.
    ```
    npm install -g @widgetsburritos/gtm-flow
    ```
    _Note: These instructions install the tool globally on your system. If you want
    to limit the scope to a particular project, drop the `-g` flag._
3. Login to Google Tag Manager, go to `Admin -> Container -> Export Container`
4. Click the `Choose a version or workspace` button and then specify the
   desired workspace.
5. Click the `Export` button.
6. Run the following commands to generate reports:
    *Tag report:*
    ```
    gtm-flow --type tag --infile /path/to/GTM-EXPORT-FILE.json --outfile /path/to/desired/location/report.html
    ```

    *Trigger report:*
    ```
    gtm-flow --type trigger --infile /path/to/GTM-EXPORT-FILE.json --outfile /path/to/desired/location/report.html
    ```
7. Open the report file to see the specific report.
